;; WorkShield Enhanced Escrow Contract
;; Handles organizations, contract creation, milestone management, and multi-token escrow logic

;; SIP-010 trait definition for multi-token support
(define-trait sip010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

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
(define-constant err-organization-not-found (err u109))
(define-constant err-not-organization-member (err u110))
(define-constant err-organization-already-exists (err u111))
(define-constant err-invalid-token-contract (err u112))
(define-constant err-unsupported-token-type (err u113))

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

;; Organization Role Constants
(define-constant role-owner "owner")
(define-constant role-admin "admin")
(define-constant role-member "member")

;; Token Type Constants
(define-constant token-type-stx "STX")
(define-constant token-type-sbtc "sBTC")

;; STX Pseudo Address (used for STX contracts)
(define-constant stx-token-address 'SP000000000000000000002Q6VF78)

;; Data Variables
(define-data-var next-contract-id uint u1)
(define-data-var next-organization-id uint u1)

;; Data Maps

;; Organization Management Maps
(define-map organizations
  uint
  {
    owner: principal,
    name: (string-ascii 100),
    description: (string-utf8 500),
    active: bool,
    created-at: uint
  }
)

(define-map organization-members
  {org-id: uint, member: principal}
  {
    role: (string-ascii 20),
    added-at: uint,
    added-by: principal
  }
)

;; Enhanced Contract Maps with Organization Support
(define-map contracts
  uint
  {
    org-id: (optional uint),
    client: principal,
    freelancer: principal,
    token-type: (string-ascii 10),
    token-contract: principal,
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

;; Organization Helper Functions
(define-private (is-organization-owner (org-id uint) (user principal))
  (match (map-get? organizations org-id)
    org-data (is-eq (get owner org-data) user)
    false
  )
)

(define-private (is-organization-member (org-id uint) (user principal))
  (is-some (map-get? organization-members {org-id: org-id, member: user}))
)

(define-private (has-organization-role (org-id uint) (user principal) (required-role (string-ascii 20)))
  (match (map-get? organization-members {org-id: org-id, member: user})
    member-data (or 
      (is-eq (get role member-data) required-role)
      (is-eq (get role member-data) role-owner))
    false
  )
)

;; Public Functions

;; ================================================================================
;; ORGANIZATION MANAGEMENT FUNCTIONS
;; ================================================================================

;; Create a new organization
(define-public (create-organization (name (string-ascii 100)) (description (string-utf8 500)))
  (let ((org-id (var-get next-organization-id)))
    (begin
      ;; Create the organization
      (map-set organizations org-id {
        owner: tx-sender,
        name: name,
        description: description,
        active: true,
        created-at: stacks-block-height
      })
      
      ;; Add creator as owner member
      (map-set organization-members 
        {org-id: org-id, member: tx-sender}
        {
          role: role-owner,
          added-at: stacks-block-height,
          added-by: tx-sender
        }
      )
      
      ;; Increment organization ID
      (var-set next-organization-id (+ org-id u1))
      
      ;; Print event
      (print {
        action: "organization-created",
        org-id: org-id,
        owner: tx-sender,
        name: name
      })
      
      (ok org-id)
    )
  )
)

;; Add member to organization
(define-public (add-organization-member (org-id uint) (member principal) (role (string-ascii 20)))
  (begin
    ;; Verify organization exists
    (asserts! (is-some (map-get? organizations org-id)) err-organization-not-found)
    
    ;; Verify sender has permission (owner or admin)
    (asserts! (or 
      (is-organization-owner org-id tx-sender)
      (has-organization-role org-id tx-sender role-admin)
    ) err-not-authorized)
    
    ;; Verify valid role
    (asserts! (or 
      (is-eq role role-admin)
      (is-eq role role-member)
    ) err-not-authorized)
    
    ;; Add member
    (map-set organization-members 
      {org-id: org-id, member: member}
      {
        role: role,
        added-at: stacks-block-height,
        added-by: tx-sender
      }
    )
    
    ;; Print event
    (print {
      action: "member-added",
      org-id: org-id,
      member: member,
      role: role,
      added-by: tx-sender
    })
    
    (ok true)
  )
)

;; Remove member from organization
(define-public (remove-organization-member (org-id uint) (member principal))
  (begin
    ;; Verify organization exists
    (asserts! (is-some (map-get? organizations org-id)) err-organization-not-found)
    
    ;; Verify sender has permission (owner or admin)
    (asserts! (or 
      (is-organization-owner org-id tx-sender)
      (has-organization-role org-id tx-sender role-admin)
    ) err-not-authorized)
    
    ;; Cannot remove organization owner
    (asserts! (not (is-organization-owner org-id member)) err-not-authorized)
    
    ;; Remove member
    (map-delete organization-members {org-id: org-id, member: member})
    
    ;; Print event
    (print {
      action: "member-removed",
      org-id: org-id,
      member: member,
      removed-by: tx-sender
    })
    
    (ok true)
  )
)

;; Update organization details
(define-public (update-organization (org-id uint) (name (string-ascii 100)) (description (string-utf8 500)))
  (begin
    ;; Verify organization exists and sender is owner
    (asserts! (is-organization-owner org-id tx-sender) err-not-authorized)
    
    ;; Update organization
    (map-set organizations org-id {
      owner: tx-sender,
      name: name,
      description: description,
      active: true,
      created-at: (unwrap-panic (get created-at (map-get? organizations org-id)))
    })
    
    ;; Print event
    (print {
      action: "organization-updated",
      org-id: org-id,
      name: name
    })
    
    (ok true)
  )
)

;; ================================================================================
;; ENHANCED ESCROW FUNCTIONS WITH ORGANIZATION & MULTI-TOKEN SUPPORT
;; ================================================================================

;; Create individual escrow contract (STX-only, backward compatible)
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
    
    ;; Transfer STX payment to contract
    (try! (stx-transfer? total-amount tx-sender (as-contract tx-sender)))
    
    ;; Create contract record (no organization, STX token)
    (map-set contracts contract-id
      {
        org-id: none,
        client: client,
        freelancer: freelancer,
        token-type: token-type-stx,
        token-contract: stx-token-address,
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
    
    ;; Print event
    (print {
      action: "contract-created",
      contract-id: contract-id,
      client: client,
      freelancer: freelancer,
      amount: total-amount,
      token: "STX"
    })
    
    ;; Return contract ID
    (ok contract-id)
  )
)

;; Create organization-based escrow contract with multi-token support
(define-public (create-organization-contract
    (org-id uint)
    (freelancer principal)
    (token-contract <sip010-trait>)
    (description (string-utf8 500))
    (end-date uint)
    (total-amount uint))
  (let 
    (
      (contract-id (var-get next-contract-id))
      (current-time stacks-block-height)
      (token-principal (contract-of token-contract))
    )
    ;; Validations
    (asserts! (> end-date current-time) err-invalid-time-parameters)
    (asserts! (> total-amount u0) err-invalid-amount)
    (asserts! (not (is-eq tx-sender freelancer)) err-not-authorized)
    
    ;; Verify organization exists and sender is member
    (asserts! (is-some (map-get? organizations org-id)) err-organization-not-found)
    (asserts! (is-organization-member org-id tx-sender) err-not-organization-member)
    
    ;; Transfer token payment to contract
    (try! (contract-call? token-contract transfer 
      total-amount 
      tx-sender 
      (as-contract tx-sender) 
      none))
    
    ;; Create contract record
    (map-set contracts contract-id
      {
        org-id: (some org-id),
        client: tx-sender,
        freelancer: freelancer,
        token-type: token-type-sbtc,
        token-contract: token-principal,
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
    
    ;; Print event
    (print {
      action: "organization-contract-created",
      contract-id: contract-id,
      org-id: org-id,
      client: tx-sender,
      freelancer: freelancer,
      amount: total-amount,
      token: token-principal
    })
    
    ;; Return contract ID
    (ok contract-id)
  )
)

;; Create sBTC escrow contract (individual, no organization)
(define-public (create-sbtc-escrow 
    (client principal)
    (freelancer principal)
    (sbtc-contract <sip010-trait>)
    (description (string-utf8 500))
    (end-date uint)
    (total-amount uint))
  (let 
    (
      (contract-id (var-get next-contract-id))
      (current-time stacks-block-height)
      (token-principal (contract-of sbtc-contract))
    )
    ;; Validations
    (asserts! (> end-date current-time) err-invalid-time-parameters)
    (asserts! (> total-amount u0) err-invalid-amount)
    (asserts! (not (is-eq client freelancer)) err-not-authorized)
    
    ;; Transfer sBTC payment to contract
    (try! (contract-call? sbtc-contract transfer 
      total-amount 
      tx-sender 
      (as-contract tx-sender) 
      none))
    
    ;; Create contract record (no organization, sBTC token)
    (map-set contracts contract-id
      {
        org-id: none,
        client: client,
        freelancer: freelancer,
        token-type: token-type-sbtc,
        token-contract: token-principal,
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
    
    ;; Print event
    (print {
      action: "sbtc-contract-created",
      contract-id: contract-id,
      client: client,
      freelancer: freelancer,
      amount: total-amount,
      token: "sBTC"
    })
    
    ;; Return contract ID
    (ok contract-id)
  )
)

;; Create sBTC organization-based escrow contract
(define-public (create-sbtc-organization-contract
    (org-id uint)
    (freelancer principal)
    (sbtc-contract <sip010-trait>)
    (description (string-utf8 500))
    (end-date uint)
    (total-amount uint))
  (let 
    (
      (contract-id (var-get next-contract-id))
      (current-time stacks-block-height)
      (token-principal (contract-of sbtc-contract))
    )
    ;; Validations
    (asserts! (> end-date current-time) err-invalid-time-parameters)
    (asserts! (> total-amount u0) err-invalid-amount)
    (asserts! (not (is-eq tx-sender freelancer)) err-not-authorized)
    
    ;; Verify organization exists and sender is member
    (asserts! (is-some (map-get? organizations org-id)) err-organization-not-found)
    (asserts! (is-organization-member org-id tx-sender) err-not-organization-member)
    
    ;; Transfer sBTC payment to contract
    (try! (contract-call? sbtc-contract transfer 
      total-amount 
      tx-sender 
      (as-contract tx-sender) 
      none))
    
    ;; Create contract record
    (map-set contracts contract-id
      {
        org-id: (some org-id),
        client: tx-sender,
        freelancer: freelancer,
        token-type: token-type-sbtc,
        token-contract: token-principal,
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
    
    ;; Print event
    (print {
      action: "sbtc-organization-contract-created",
      contract-id: contract-id,
      org-id: org-id,
      client: tx-sender,
      freelancer: freelancer,
      amount: total-amount,
      token: "sBTC"
    })
    
    ;; Return contract ID
    (ok contract-id)
  )
)

;; ================================================================================
;; READ-ONLY ORGANIZATION FUNCTIONS
;; ================================================================================

;; Get organization details
(define-read-only (get-organization (org-id uint))
  (map-get? organizations org-id)
)

;; Get organization member details
(define-read-only (get-organization-member (org-id uint) (member principal))
  (map-get? organization-members {org-id: org-id, member: member})
)

;; Check if user is organization member
(define-read-only (is-organization-member-read (org-id uint) (member principal))
  (is-organization-member org-id member)
)

;; Check if user is organization owner
(define-read-only (is-organization-owner-read (org-id uint) (member principal))
  (is-organization-owner org-id member)
)

;; Get next organization ID
(define-read-only (get-next-organization-id)
  (var-get next-organization-id)
)

;; Enhanced contract getter with token information
(define-read-only (get-contract-details (contract-id uint))
  (map-get? contracts contract-id)
)

;; ================================================================================
;; EXISTING ESCROW FUNCTIONS (ENHANCED FOR MULTI-TOKEN)
;; ================================================================================

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
    
    ;; Ensure contract has sufficient balance
    (asserts! (>= (get remaining-balance contract-data) payment-amount) err-insufficient-funds)
    
    ;; Release STX payment to freelancer from contract balance
    ;; Client pays transaction fees from their own wallet (tx-sender pays the fee)
    (try! (as-contract (stx-transfer? payment-amount tx-sender (get freelancer contract-data))))
    
    ;; Update milestone status
    (map-set milestones milestone-key
      (merge milestone-data {status: milestone-approved})
    )
    
    ;; Update contract remaining balance (only deduct the milestone amount, not fees)
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

;; Approve sBTC milestone and release payment (client)
(define-public (approve-sbtc-milestone
    (contract-id uint)
    (milestone-id uint)
    (sbtc-contract <sip010-trait>))
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
    (asserts! (is-eq (get token-type contract-data) token-type-sbtc) err-unsupported-token-type)
    
    ;; Ensure contract has sufficient balance
    (asserts! (>= (get remaining-balance contract-data) payment-amount) err-insufficient-funds)
    
    ;; Release sBTC payment to freelancer from contract balance
    ;; Client pays transaction fees from their own wallet (tx-sender pays the fee)
    (try! (as-contract (contract-call? sbtc-contract transfer 
      payment-amount 
      tx-sender 
      (get freelancer contract-data) 
      none)))
    
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
    (try! (check-sbtc-contract-completion contract-id sbtc-contract))
    
    (ok true)
  )
)

;; Check if sBTC contract is completed and update status
(define-private (check-sbtc-contract-completion (contract-id uint) (sbtc-contract <sip010-trait>))
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
          (as-contract (contract-call? sbtc-contract transfer 
            (get remaining-balance contract-data) 
            tx-sender 
            (get client contract-data) 
            none))
          (ok true)
        )
      )
      (ok true)
    )
  )
)

;; Emergency sBTC release function
(define-public (release-remaining-sbtc-balance
    (contract-id uint)
    (milestone-id uint)
    (sbtc-contract <sip010-trait>))
  (let 
    (
      (milestone-key {contract-id: contract-id, milestone-id: milestone-id})
      (milestone-data (unwrap! (map-get? milestones milestone-key) err-invalid-milestone))
      (contract-data (unwrap! (map-get? contracts contract-id) err-invalid-state))
      (remaining-balance (get remaining-balance contract-data))
      (milestone-amount (get amount milestone-data))
    )
    ;; Validations
    (asserts! (is-client contract-id tx-sender) err-not-authorized)
    (asserts! (is-contract-active contract-id) err-invalid-state)
    (asserts! (is-eq (get status milestone-data) milestone-submitted) err-invalid-state)
    (asserts! (is-eq (get token-type contract-data) token-type-sbtc) err-unsupported-token-type)
    ;; Only allow if remaining balance is less than milestone amount (emergency situation)
    (asserts! (< remaining-balance milestone-amount) err-invalid-state)
    ;; Ensure there's something to release
    (asserts! (> remaining-balance u0) err-insufficient-funds)
    
    ;; Release whatever sBTC balance remains to freelancer
    ;; Client pays transaction fees from their wallet
    (try! (as-contract (contract-call? sbtc-contract transfer 
      remaining-balance 
      tx-sender 
      (get freelancer contract-data) 
      none)))
    
    ;; Update milestone status to approved (partial)
    (map-set milestones milestone-key
      (merge milestone-data {
        status: milestone-approved,
        submission-note: (some u"[PARTIAL sBTC RELEASE - EMERGENCY]")
      })
    )
    
    ;; Update contract remaining balance to zero
    (map-set contracts contract-id
      (merge contract-data {remaining-balance: u0})
    )
    
    ;; Check if contract is completed
    (try! (check-sbtc-contract-completion contract-id sbtc-contract))
    
    (ok remaining-balance)
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

;; Emergency function to release remaining balance when milestone can't be approved
;; Can be called when remaining balance is less than milestone amount
(define-public (release-remaining-balance
    (contract-id uint)
    (milestone-id uint))
  (let 
    (
      (milestone-key {contract-id: contract-id, milestone-id: milestone-id})
      (milestone-data (unwrap! (map-get? milestones milestone-key) err-invalid-milestone))
      (contract-data (unwrap! (map-get? contracts contract-id) err-invalid-state))
      (remaining-balance (get remaining-balance contract-data))
      (milestone-amount (get amount milestone-data))
    )
    ;; Validations
    (asserts! (is-client contract-id tx-sender) err-not-authorized)
    (asserts! (is-contract-active contract-id) err-invalid-state)
    (asserts! (is-eq (get status milestone-data) milestone-submitted) err-invalid-state)
    ;; Only allow if remaining balance is less than milestone amount (emergency situation)
    (asserts! (< remaining-balance milestone-amount) err-invalid-state)
    ;; Ensure there's something to release
    (asserts! (> remaining-balance u0) err-insufficient-funds)
    
    ;; Release whatever balance remains to freelancer
    ;; Client pays transaction fees from their wallet
    (try! (as-contract (stx-transfer? remaining-balance tx-sender (get freelancer contract-data))))
    
    ;; Update milestone status to approved (partial)
    (map-set milestones milestone-key
      (merge milestone-data {
        status: milestone-approved,
        submission-note: (some u"[PARTIAL RELEASE - EMERGENCY]")
      })
    )
    
    ;; Update contract remaining balance to zero
    (map-set contracts contract-id
      (merge contract-data {remaining-balance: u0})
    )
    
    ;; Check if contract is completed
    (try! (check-contract-completion contract-id))
    
    (ok remaining-balance)
  )
)

;; Get milestone count for a contract
(define-read-only (get-milestone-count (contract-id uint))
  (default-to u0 (map-get? milestone-counters contract-id))
)

;; Check if user is authorized for contract
(define-read-only (is-authorized (contract-id uint) (user principal))
  (or (is-client contract-id user) (is-freelancer contract-id user))
)

;; Get the next contract ID (tells us total contracts)
(define-read-only (get-next-contract-id)
  (var-get next-contract-id)
)

;; Get total contracts created so far
(define-read-only (get-total-contracts)
  (- (var-get next-contract-id) u1)
)

;; Get contract token type
(define-read-only (get-contract-token-type (contract-id uint))
  (match (map-get? contracts contract-id)
    contract-data (some (get token-type contract-data))
    none
  )
)