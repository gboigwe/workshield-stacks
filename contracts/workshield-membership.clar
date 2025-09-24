;; WorkShield Membership Committee Contract
;; Manages a 5-member committee that approves new DAO members

;; Constants
(define-constant contract-admin tx-sender)
(define-constant committee-size u5)
(define-constant required-approvals u3) ;; 3 out of 5 approval threshold

;; Error codes
(define-constant err-admin-only (err u400))
(define-constant err-not-committee-member (err u401))
(define-constant err-committee-full (err u402))
(define-constant err-invalid-member (err u403))
(define-constant err-proposal-not-found (err u404))
(define-constant err-already-voted (err u405))
(define-constant err-proposal-already-decided (err u406))
(define-constant err-insufficient-stake (err u407))
(define-constant err-stake-transfer-failed (err u408))

;; Proposal status constants
(define-constant proposal-pending u0)
(define-constant proposal-approved u1)
(define-constant proposal-rejected u2)

;; Staking constants
(define-constant required-stake u10000000000) ;; 10,000 STX in microSTX
(define-constant slash-percentage u50) ;; 50% of stake can be slashed

;; Data variables
(define-data-var next-proposal-id uint u1)
(define-data-var committee-count uint u0)
(define-data-var dao-contract-principal (optional principal) none)

;; Data maps
(define-map committee-members principal bool)

(define-map member-proposals
  uint
  {
    nominee: principal,
    proposer: principal,
    stake-amount: uint,
    approvals: uint,
    rejections: uint,
    status: uint,
    created-at: uint,
    decided-at: (optional uint)
  }
)

(define-map proposal-votes
  {proposal-id: uint, voter: principal}
  {vote: bool, timestamp: uint}
)

;; Staking maps
(define-map member-stakes principal uint)
(define-map staked-amounts principal uint)

;; Events for tracking
(define-map proposal-events
  uint
  {
    event-type: (string-ascii 32),
    timestamp: uint,
    details: (string-utf8 200)
  }
)

;; Private functions
(define-private (is-committee-member (member principal))
  (default-to false (map-get? committee-members member))
)

(define-private (has-voted (proposal-id uint) (voter principal))
  (is-some (map-get? proposal-votes {proposal-id: proposal-id, voter: voter}))
)

(define-private (tally-votes (proposal-id uint))
  (match (map-get? member-proposals proposal-id)
    proposal-data {
      approvals: (get approvals proposal-data),
      rejections: (get rejections proposal-data)
    }
    {approvals: u0, rejections: u0}
  )
)

(define-private (finalize-proposal (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? member-proposals proposal-id) err-proposal-not-found))
      (current-time stacks-block-height)
      (approvals (get approvals proposal-data))
      (rejections (get rejections proposal-data))
    )
    (if (>= approvals required-approvals)
      ;; Approve the proposal
      (begin
        (map-set member-proposals proposal-id
          (merge proposal-data {
            status: proposal-approved,
            decided-at: (some current-time)
          })
        )
        ;; TODO: Notify DAO contract to add member (would need traits)
        ;; (match (var-get dao-contract-principal)
        ;;   dao-contract (contract-call? dao-contract add-approved-member (get nominee proposal-data))
        ;;   (ok true)
        ;; )
        (ok true)
      )
      ;; Check if enough rejections to reject
      (if (>= rejections (- committee-size required-approvals))
        (begin
          (map-set member-proposals proposal-id
            (merge proposal-data {
              status: proposal-rejected,
              decided-at: (some current-time)
            })
          )
          ;; Return stake to nominee
          (as-contract (stx-transfer? (get stake-amount proposal-data) tx-sender (get nominee proposal-data)))
        )
        (ok true)
      )
    )
  )
)

;; Admin functions

;; Set committee member (admin only)
(define-public (set-committee-member (member principal) (is-member bool))
  (begin
    (asserts! (is-eq tx-sender contract-admin) err-admin-only)
    
    (if is-member
      ;; Adding member
      (begin
        (asserts! (< (var-get committee-count) committee-size) err-committee-full)
        (asserts! (not (is-committee-member member)) err-invalid-member)
        
        (map-set committee-members member true)
        (var-set committee-count (+ (var-get committee-count) u1))
      )
      ;; Removing member
      (begin
        (asserts! (is-committee-member member) err-invalid-member)
        
        (map-delete committee-members member)
        (var-set committee-count (- (var-get committee-count) u1))
      )
    )
    
    (ok true)
  )
)

;; Set DAO contract principal (admin only)
(define-public (set-dao-contract (dao-contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-admin) err-admin-only)
    (var-set dao-contract-principal (some dao-contract))
    (ok true)
  )
)

;; Public functions

;; Propose new DAO member with stake
(define-public (propose-member (nominee principal))
  (let 
    (
      (proposal-id (var-get next-proposal-id))
      (current-time stacks-block-height)
    )
    ;; Validations
    (asserts! (is-committee-member tx-sender) err-not-committee-member)
    (asserts! (not (is-eq nominee tx-sender)) err-invalid-member)
    
    ;; Transfer stake from nominee
    (asserts! (>= (stx-get-balance nominee) required-stake) err-insufficient-stake)
    (try! (stx-transfer? required-stake nominee (as-contract tx-sender)))
    
    ;; Create proposal
    (map-set member-proposals proposal-id
      {
        nominee: nominee,
        proposer: tx-sender,
        stake-amount: required-stake,
        approvals: u1, ;; Proposer automatically approves
        rejections: u0,
        status: proposal-pending,
        created-at: current-time,
        decided-at: none
      }
    )
    
    ;; Record proposer's vote
    (map-set proposal-votes {proposal-id: proposal-id, voter: tx-sender}
      {vote: true, timestamp: current-time}
    )
    
    ;; Record stake
    (map-set member-stakes nominee proposal-id)
    (map-set staked-amounts nominee required-stake)
    
    ;; Increment proposal ID
    (var-set next-proposal-id (+ proposal-id u1))
    
    ;; Check if proposal can be finalized
    (try! (finalize-proposal proposal-id))
    
    (ok proposal-id)
  )
)

;; Vote on member proposal
(define-public (vote-on-proposal (proposal-id uint) (approve bool))
  (let 
    (
      (proposal-data (unwrap! (map-get? member-proposals proposal-id) err-proposal-not-found))
      (current-time stacks-block-height)
      (vote-key {proposal-id: proposal-id, voter: tx-sender})
    )
    ;; Validations
    (asserts! (is-committee-member tx-sender) err-not-committee-member)
    (asserts! (is-eq (get status proposal-data) proposal-pending) err-proposal-already-decided)
    (asserts! (not (has-voted proposal-id tx-sender)) err-already-voted)
    
    ;; Record vote
    (map-set proposal-votes vote-key
      {vote: approve, timestamp: current-time}
    )
    
    ;; Update proposal counts
    (if approve
      (map-set member-proposals proposal-id
        (merge proposal-data {
          approvals: (+ (get approvals proposal-data) u1)
        })
      )
      (map-set member-proposals proposal-id
        (merge proposal-data {
          rejections: (+ (get rejections proposal-data) u1)
        })
      )
    )
    
    ;; Check if proposal can be finalized
    (try! (finalize-proposal proposal-id))
    
    (ok true)
  )
)

;; Slash member stake for malicious behavior
(define-public (slash-member-stake (member principal) (proposal-id uint))
  (let 
    (
      (staked-amount (default-to u0 (map-get? staked-amounts member)))
      (slash-amount (/ (* staked-amount slash-percentage) u100))
    )
    ;; Only admin or DAO contract can slash
    (asserts! (or 
      (is-eq tx-sender contract-admin)
      (is-eq (some tx-sender) (var-get dao-contract-principal))
    ) err-admin-only)
    
    (asserts! (> staked-amount u0) err-insufficient-stake)
    
    ;; Transfer slashed amount to platform treasury
    (try! (as-contract (stx-transfer? slash-amount tx-sender contract-admin)))
    
    ;; Update staked amount
    (map-set staked-amounts member (- staked-amount slash-amount))
    
    (ok slash-amount)
  )
)

;; Withdraw remaining stake (after DAO membership ends)
(define-public (withdraw-stake)
  (let 
    (
      (staked-amount (default-to u0 (map-get? staked-amounts tx-sender)))
    )
    (asserts! (> staked-amount u0) err-insufficient-stake)
    
    ;; Transfer remaining stake back to member
    (try! (as-contract (stx-transfer? staked-amount tx-sender tx-sender)))
    
    ;; Clear stake records
    (map-delete staked-amounts tx-sender)
    (map-delete member-stakes tx-sender)
    
    (ok staked-amount)
  )
)

;; Read-only functions

;; Get committee member status
(define-read-only (get-committee-member-status (member principal))
  {
    is-member: (is-committee-member member),
    committee-count: (var-get committee-count)
  }
)

;; Get proposal details
(define-read-only (get-proposal (proposal-id uint))
  (map-get? member-proposals proposal-id)
)

;; Get vote details
(define-read-only (get-vote (proposal-id uint) (voter principal))
  (map-get? proposal-votes {proposal-id: proposal-id, voter: voter})
)

;; Get member stake info
(define-read-only (get-member-stake-info (member principal))
  {
    proposal-id: (map-get? member-stakes member),
    staked-amount: (default-to u0 (map-get? staked-amounts member))
  }
)

;; Get proposal voting summary
(define-read-only (get-proposal-summary (proposal-id uint))
  (match (map-get? member-proposals proposal-id)
    proposal-data (some {
      nominee: (get nominee proposal-data),
      approvals: (get approvals proposal-data),
      rejections: (get rejections proposal-data),
      status: (get status proposal-data),
      required-approvals: required-approvals,
      committee-size: committee-size
    })
    none
  )
)

;; Get current DAO contract
(define-read-only (get-dao-contract)
  (var-get dao-contract-principal)
)
