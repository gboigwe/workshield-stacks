;; WorkShield Core Escrow Contract
;; Handles contract creation, milestone management, and escrow logic

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-authorized (err u101))
(define-constant err-invalid-state (err u102))
(define-constant err-insufficient-funds (err u103))
(define-constant err-invalid-milestone (err u104))
(define-constant err-invalid-amount (err u105))
(define-constant err-deadline-exceeded (err u106))
(define-constant err-milestone-amount-mismatch (err u107))
(define-constant err-invalid-time-parameters (err u108))

;; Contract Status Constants
(define-constant status-active u0)
(define-constant status-completed u1)
(define-constant status-disputed u2)
(define-constant status-cancelled u3)

;; Milestone Status Constants
(define-constant milestone-pending u0)
(define-constant milestone-submitted u1)
(define-constant milestone-approved u2)
(define-constant milestone-rejected u3)

;; Data Variables
(define-data-var next-contract-id uint u1)

;; Data Maps
(define-map contracts
  uint
  {
    client: principal,
    freelancer: principal,
    total-amount: uint,
    remaining-balance: uint,
    status: uint,
    created-at: uint,
    end-date: uint,
    description: (string-utf8 500)
  }
)

(define-map milestones
  {contract-id: uint, milestone-id: uint}
  {
    description: (string-utf8 300),
    amount: uint,
    status: uint,
    deadline: uint,
    submission-note: (optional (string-utf8 500)),
    rejection-reason: (optional (string-utf8 500))
  }
)

(define-map milestone-counters uint uint)

;; Events
(define-map contract-events
  uint
  {
    event-type: (string-ascii 32),
    timestamp: uint,
    details: (string-utf8 200)
  }
)

;; Private Functions
(define-private (is-client (contract-id uint) (user principal))
  (match (map-get? contracts contract-id)
    contract-data (is-eq (get client contract-data) user)
    false
  )
)

(define-private (is-freelancer (contract-id uint) (user principal))
  (match (map-get? contracts contract-id)
    contract-data (is-eq (get freelancer contract-data) user)
    false
  )
)

(define-private (is-contract-active (contract-id uint))
  (match (map-get? contracts contract-id)
    contract-data (is-eq (get status contract-data) status-active)
    false
  )
)

(define-private (get-total-milestone-amount (contract-id uint))
  (let ((milestone-count (default-to u0 (map-get? milestone-counters contract-id))))
    (fold + (map get-milestone-amount (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10)) u0)
  )
)

(define-private (get-milestone-amount (milestone-id uint))
  u0 ;; Simplified for now - would need proper iteration
)

;; Public Functions

;; Create a new escrow contract
(define-public (create-escrow 
    (client principal)
    (freelancer principal)
    (description (string-utf8 500))
    (end-date uint)
    (total-amount uint))
  (let 
    (
      (contract-id (var-get next-contract-id))
      (current-time stacks-block-height)
    )
    ;; Validations
    (asserts! (> end-date current-time) err-invalid-time-parameters)
    (asserts! (> total-amount u0) err-invalid-amount)
    (asserts! (not (is-eq client freelancer)) err-not-authorized)
    
    ;; Transfer payment to contract
    (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))
    
    ;; Create contract record
    (map-set contracts contract-id
      {
        client: client,
        freelancer: freelancer,
        total-amount: total-amount,
        remaining-balance: total-amount,
        status: status-active,
        created-at: current-time,
        end-date: end-date,
        description: description
      }
    )
    
    ;; Initialize milestone counter
    (map-set milestone-counters contract-id u0)
    
    ;; Increment contract ID
    (var-set next-contract-id (+ contract-id u1))
    
    ;; Return contract ID
    (ok contract-id)
  )
)

;; Add a milestone to an existing contract
(define-public (add-milestone
    (contract-id uint)
    (description (string-utf8 300))
    (amount uint)
    (deadline uint))
  (let 
    (
      (contract-data (unwrap! (map-get? contracts contract-id) err-invalid-state))
      (current-milestone-count (default-to u0 (map-get? milestone-counters contract-id)))
      (new-milestone-id (+ current-milestone-count u1))
      (current-time (- stacks-block-height u1))
    )
    ;; Validations
    (asserts! (is-client contract-id tx-sender) err-not-authorized)
    (asserts! (is-contract-active contract-id) err-invalid-state)
    (asserts! (> deadline current-time) err-deadline-exceeded)
    (asserts! (< deadline (get end-date contract-data)) err-invalid-time-parameters)
    (asserts! (> amount u0) err-invalid-amount)
    (asserts! (<= amount (get remaining-balance contract-data)) err-insufficient-funds)
    
    ;; Create milestone
    (map-set milestones {contract-id: contract-id, milestone-id: new-milestone-id}
      {
        description: description,
        amount: amount,
        status: milestone-pending,
        deadline: deadline,
        submission-note: none,
        rejection-reason: none
      }
    )
    
    ;; Update milestone counter
    (map-set milestone-counters contract-id new-milestone-id)
    
    (ok new-milestone-id)
  )
)

;; Submit a milestone as completed (freelancer)
(define-public (submit-milestone
    (contract-id uint)
    (milestone-id uint)
    (submission-note (string-utf8 500)))
  (let 
    (
      (milestone-key {contract-id: contract-id, milestone-id: milestone-id})
      (milestone-data (unwrap! (map-get? milestones milestone-key) err-invalid-milestone))
    )
    ;; Validations
    (asserts! (is-freelancer contract-id tx-sender) err-not-authorized)
    (asserts! (is-contract-active contract-id) err-invalid-state)
    (asserts! (is-eq (get status milestone-data) milestone-pending) err-invalid-state)
    
    ;; Update milestone status
    (map-set milestones milestone-key
      (merge milestone-data {
        status: milestone-submitted,
        submission-note: (some submission-note)
      })
    )
    
    (ok true)
  )
)

;; Approve a milestone and release payment (client)
(define-public (approve-milestone
    (contract-id uint)
    (milestone-id uint))
  (let 
    (
      (milestone-key {contract-id: contract-id, milestone-id: milestone-id})
      (milestone-data (unwrap! (map-get? milestones milestone-key) err-invalid-milestone))
      (contract-data (unwrap! (map-get? contracts contract-id) err-invalid-state))
      (payment-amount (get amount milestone-data))
    )
    ;; Validations
    (asserts! (is-client contract-id tx-sender) err-not-authorized)
    (asserts! (is-contract-active contract-id) err-invalid-state)
    (asserts! (is-eq (get status milestone-data) milestone-submitted) err-invalid-state)
    
    ;; Release payment to freelancer
    (try! (as-contract (stx-transfer? payment-amount tx-sender (get freelancer contract-data))))
    
    ;; Update milestone status
    (map-set milestones milestone-key
      (merge milestone-data {status: milestone-approved})
    )
    
    ;; Update contract remaining balance
    (map-set contracts contract-id
      (merge contract-data {
        remaining-balance: (- (get remaining-balance contract-data) payment-amount)
      })
    )
    
    ;; Check if contract is completed
    (try! (check-contract-completion contract-id))
    
    (ok true)
  )
)

;; Reject a milestone submission (client)
(define-public (reject-milestone
    (contract-id uint)
    (milestone-id uint)
    (rejection-reason (string-utf8 500)))
  (let 
    (
      (milestone-key {contract-id: contract-id, milestone-id: milestone-id})
      (milestone-data (unwrap! (map-get? milestones milestone-key) err-invalid-milestone))
    )
    ;; Validations
    (asserts! (is-client contract-id tx-sender) err-not-authorized)
    (asserts! (is-contract-active contract-id) err-invalid-state)
    (asserts! (is-eq (get status milestone-data) milestone-submitted) err-invalid-state)
    
    ;; Update milestone status
    (map-set milestones milestone-key
      (merge milestone-data {
        status: milestone-rejected,
        rejection-reason: (some rejection-reason)
      })
    )
    
    (ok true)
  )
)

;; Check if contract is completed and update status
(define-private (check-contract-completion (contract-id uint))
  (let 
    (
      (contract-data (unwrap! (map-get? contracts contract-id) err-invalid-state))
      (milestone-count (default-to u0 (map-get? milestone-counters contract-id)))
    )
    ;; If remaining balance is 0 or very small, mark as completed
    (if (<= (get remaining-balance contract-data) u100) ;; Allow for small dust amounts
      (begin
        (map-set contracts contract-id
          (merge contract-data {status: status-completed})
        )
        ;; Return any dust amount to client
        (if (> (get remaining-balance contract-data) u0)
          (as-contract (stx-transfer? (get remaining-balance contract-data) tx-sender (get client contract-data)))
          (ok true)
        )
      )
      (ok true)
    )
  )
)

;; Read-only functions

;; Get contract details
(define-read-only (get-contract (contract-id uint))
  (map-get? contracts contract-id)
)

;; Get milestone details
(define-read-only (get-milestone (contract-id uint) (milestone-id uint))
  (map-get? milestones {contract-id: contract-id, milestone-id: milestone-id})
)

;; Get milestone count for a contract
(define-read-only (get-milestone-count (contract-id uint))
  (default-to u0 (map-get? milestone-counters contract-id))
)

;; Check if user is authorized for contract
(define-read-only (is-authorized (contract-id uint) (user principal))
  (or (is-client contract-id user) (is-freelancer contract-id user))
)
