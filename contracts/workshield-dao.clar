;; WorkShield Multisig DAO Contract
;; Manages up to 100 voting members for dispute resolution and escrow decisions

;; Constants
(define-constant contract-admin tx-sender)
(define-constant max-dao-members u100)
(define-constant supermajority-threshold u70) ;; 70% threshold for decisions
(define-constant voting-period-blocks u1440) ;; ~10 days (assuming 10 min blocks)

;; Error codes
(define-constant err-admin-only (err u500))
(define-constant err-not-member (err u501))
(define-constant err-proposal-not-found (err u502))
(define-constant err-voting-ended (err u503))
(define-constant err-already-voted (err u504))
(define-constant err-insufficient-votes (err u505))
(define-constant err-dao-full (err u506))
(define-constant err-invalid-proposal-type (err u507))
(define-constant err-proposal-already-executed (err u508))
(define-constant err-member-already-exists (err u509))

;; Proposal types
(define-constant proposal-type-dispute u0)
(define-constant proposal-type-escrow-release u1)
(define-constant proposal-type-escrow-refund u2)
(define-constant proposal-type-remove-member u3)

;; Proposal status
(define-constant proposal-active u0)
(define-constant proposal-passed u1)
(define-constant proposal-failed u2)
(define-constant proposal-executed u3)

;; Vote options
(define-constant vote-yes u1)
(define-constant vote-no u2)
(define-constant vote-abstain u3)

;; Data variables
(define-data-var next-proposal-id uint u1)
(define-data-var dao-member-count uint u0)
(define-data-var membership-contract (optional principal) none)
(define-data-var escrow-contract (optional principal) none)
(define-data-var dispute-contract (optional principal) none)

;; Data maps
(define-map dao-members principal bool)

(define-map proposals
  uint
  {
    proposer: principal,
    proposal-type: uint,
    target-contract-id: uint,
    target-member: (optional principal),
    description: (string-utf8 500),
    yes-votes: uint,
    no-votes: uint,
    abstain-votes: uint,
    total-eligible-voters: uint,
    status: uint,
    created-at: uint,
    voting-ends-at: uint,
    executed-at: (optional uint)
  }
)

(define-map proposal-votes
  {proposal-id: uint, voter: principal}
  {vote: uint, timestamp: uint}
)

;; Member activity tracking
(define-map member-activity
  principal
  {
    last-vote: uint,
    total-votes: uint,
    proposals-created: uint
  }
)

;; Dispute resolution data
(define-map dispute-resolutions
  uint
  {
    dispute-id: uint,
    resolution-type: uint,
    executed: bool
  }
)

;; Escrow decision data
(define-map escrow-decisions
  uint
  {
    contract-id: uint,
    decision-type: uint,
    recipient: principal,
    amount: uint,
    executed: bool
  }
)

;; Private functions
(define-private (is-dao-member (member principal))
  (default-to false (map-get? dao-members member))
)

(define-private (has-voted (proposal-id uint) (voter principal))
  (is-some (map-get? proposal-votes {proposal-id: proposal-id, voter: voter}))
)

(define-private (calculate-vote-threshold (total-voters uint))
  (/ (* total-voters supermajority-threshold) u100)
)

(define-private (is-proposal-active (proposal-id uint))
  (match (map-get? proposals proposal-id)
    proposal-data (and 
      (is-eq (get status proposal-data) proposal-active)
      (< stacks-block-height (get voting-ends-at proposal-data))
    )
    false
  )
)

(define-private (finalize-proposal (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (current-time stacks-block-height)
      (yes-votes (get yes-votes proposal-data))
      (total-voters (get total-eligible-voters proposal-data))
      (required-threshold (calculate-vote-threshold total-voters))
    )
    ;; Check if voting period ended
    (if (>= current-time (get voting-ends-at proposal-data))
      ;; Voting ended, determine result
      (if (>= yes-votes required-threshold)
        ;; Proposal passed
        (begin
          (map-set proposals proposal-id
            (merge proposal-data {status: proposal-passed})
          )
          (try! (execute-proposal proposal-id))
          (ok true)
        )
        ;; Proposal failed
        (begin
          (map-set proposals proposal-id
            (merge proposal-data {status: proposal-failed})
          )
          (ok false)
        )
      )
      ;; Voting still active
      (ok true)
    )
  )
)

(define-private (execute-proposal (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (proposal-type (get proposal-type proposal-data))
      (current-time stacks-block-height)
    )
    (asserts! (is-eq (get status proposal-data) proposal-passed) err-insufficient-votes)
    
    ;; Execute based on proposal type
    (if (is-eq proposal-type proposal-type-dispute)
      (execute-dispute-resolution proposal-id)
      (if (is-eq proposal-type proposal-type-escrow-release)
        (execute-escrow-release proposal-id)
        (if (is-eq proposal-type proposal-type-escrow-refund)
          (execute-escrow-refund proposal-id)
          (if (is-eq proposal-type proposal-type-remove-member)
            (execute-member-removal proposal-id)
            err-invalid-proposal-type
          )
        )
      )
    )
  )
)

(define-private (execute-dispute-resolution (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (dispute-id (get target-contract-id proposal-data))
    )
    ;; For now, just mark as executed - actual contract calls would need traits
    ;; TODO: Implement proper contract calls with traits
    (map-set proposals proposal-id
      (merge proposal-data {
        status: proposal-executed,
        executed-at: (some stacks-block-height)
      })
    )
    (ok true)
  )
)

(define-private (execute-escrow-release (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (contract-id (get target-contract-id proposal-data))
    )
    ;; For now, just mark as executed - actual contract calls would need traits
    ;; TODO: Implement proper contract calls with traits
    (map-set proposals proposal-id
      (merge proposal-data {
        status: proposal-executed,
        executed-at: (some stacks-block-height)
      })
    )
    (ok true)
  )
)

(define-private (execute-escrow-refund (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (contract-id (get target-contract-id proposal-data))
    )
    ;; For now, just mark as executed - actual contract calls would need traits
    ;; TODO: Implement proper contract calls with traits
    (map-set proposals proposal-id
      (merge proposal-data {
        status: proposal-executed,
        executed-at: (some stacks-block-height)
      })
    )
    (ok true)
  )
)

(define-private (execute-member-removal (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (member-to-remove (unwrap! (get target-member proposal-data) err-proposal-not-found))
    )
    ;; Remove member from DAO
    (asserts! (is-dao-member member-to-remove) err-not-member)
    
    (map-delete dao-members member-to-remove)
    (var-set dao-member-count (- (var-get dao-member-count) u1))
    
    (map-set proposals proposal-id
      (merge proposal-data {
        status: proposal-executed,
        executed-at: (some stacks-block-height)
      })
    )
    
    (ok true)
  )
)

;; Admin functions

;; Set contract references (admin only)
(define-public (set-membership-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-admin) err-admin-only)
    (var-set membership-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-escrow-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-admin) err-admin-only)
    (var-set escrow-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-dispute-contract (contract-principal principal))
  (begin
    (asserts! (is-eq tx-sender contract-admin) err-admin-only)
    (var-set dispute-contract (some contract-principal))
    (ok true)
  )
)

;; Public functions

;; Add approved member (called by membership contract)
(define-public (add-approved-member (new-member principal))
  (begin
    ;; Only membership contract can call this
    (asserts! (is-eq (some tx-sender) (var-get membership-contract)) err-admin-only)
    (asserts! (< (var-get dao-member-count) max-dao-members) err-dao-full)
    (asserts! (not (is-dao-member new-member)) err-member-already-exists)
    
    ;; Add member
    (map-set dao-members new-member true)
    (var-set dao-member-count (+ (var-get dao-member-count) u1))
    
    ;; Initialize activity tracking
    (map-set member-activity new-member {
      last-vote: u0,
      total-votes: u0,
      proposals-created: u0
    })
    
    (ok true)
  )
)

;; Create proposal for dispute resolution
(define-public (propose-dispute-resolution 
    (dispute-id uint)
    (description (string-utf8 500)))
  (let 
    (
      (proposal-id (var-get next-proposal-id))
      (current-time stacks-block-height)
      (voting-ends (+ current-time voting-period-blocks))
      (total-voters (var-get dao-member-count))
    )
    ;; Validations
    (asserts! (is-dao-member tx-sender) err-not-member)
    (asserts! (> total-voters u0) err-insufficient-votes)
    
    ;; Create proposal
    (map-set proposals proposal-id
      {
        proposer: tx-sender,
        proposal-type: proposal-type-dispute,
        target-contract-id: dispute-id,
        target-member: none,
        description: description,
        yes-votes: u0,
        no-votes: u0,
        abstain-votes: u0,
        total-eligible-voters: total-voters,
        status: proposal-active,
        created-at: current-time,
        voting-ends-at: voting-ends,
        executed-at: none
      }
    )
    
    ;; Update proposer activity
    (let ((activity (default-to {last-vote: u0, total-votes: u0, proposals-created: u0} 
                                (map-get? member-activity tx-sender))))
      (map-set member-activity tx-sender
        (merge activity {proposals-created: (+ (get proposals-created activity) u1)})
      )
    )
    
    ;; Increment proposal ID
    (var-set next-proposal-id (+ proposal-id u1))
    
    (ok proposal-id)
  )
)

;; Create proposal for escrow release
(define-public (propose-escrow-release 
    (contract-id uint)
    (description (string-utf8 500)))
  (let 
    (
      (proposal-id (var-get next-proposal-id))
      (current-time stacks-block-height)
      (voting-ends (+ current-time voting-period-blocks))
      (total-voters (var-get dao-member-count))
    )
    ;; Validations
    (asserts! (is-dao-member tx-sender) err-not-member)
    (asserts! (> total-voters u0) err-insufficient-votes)
    
    ;; Create proposal
    (map-set proposals proposal-id
      {
        proposer: tx-sender,
        proposal-type: proposal-type-escrow-release,
        target-contract-id: contract-id,
        target-member: none,
        description: description,
        yes-votes: u0,
        no-votes: u0,
        abstain-votes: u0,
        total-eligible-voters: total-voters,
        status: proposal-active,
        created-at: current-time,
        voting-ends-at: voting-ends,
        executed-at: none
      }
    )
    
    ;; Update proposer activity
    (let ((activity (default-to {last-vote: u0, total-votes: u0, proposals-created: u0} 
                                (map-get? member-activity tx-sender))))
      (map-set member-activity tx-sender
        (merge activity {proposals-created: (+ (get proposals-created activity) u1)})
      )
    )
    
    ;; Increment proposal ID
    (var-set next-proposal-id (+ proposal-id u1))
    
    (ok proposal-id)
  )
)

;; Vote on proposal
(define-public (vote-on-proposal (proposal-id uint) (vote uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
      (current-time stacks-block-height)
      (vote-key {proposal-id: proposal-id, voter: tx-sender})
    )
    ;; Validations
    (asserts! (is-dao-member tx-sender) err-not-member)
    (asserts! (is-proposal-active proposal-id) err-voting-ended)
    (asserts! (not (has-voted proposal-id tx-sender)) err-already-voted)
    (asserts! (or (is-eq vote vote-yes) (is-eq vote vote-no) (is-eq vote vote-abstain)) err-invalid-proposal-type)
    
    ;; Record vote
    (map-set proposal-votes vote-key
      {vote: vote, timestamp: current-time}
    )
    
    ;; Update proposal vote counts
    (let ((updated-proposal
      (if (is-eq vote vote-yes)
        (merge proposal-data {yes-votes: (+ (get yes-votes proposal-data) u1)})
        (if (is-eq vote vote-no)
          (merge proposal-data {no-votes: (+ (get no-votes proposal-data) u1)})
          (merge proposal-data {abstain-votes: (+ (get abstain-votes proposal-data) u1)})
        )
      )))
      (map-set proposals proposal-id updated-proposal)
    )
    
    ;; Update voter activity
    (let ((activity (default-to {last-vote: u0, total-votes: u0, proposals-created: u0} 
                                (map-get? member-activity tx-sender))))
      (map-set member-activity tx-sender
        (merge activity {
          last-vote: current-time,
          total-votes: (+ (get total-votes activity) u1)
        })
      )
    )
    
    ;; Check if proposal can be finalized
    (try! (finalize-proposal proposal-id))
    
    (ok true)
  )
)

;; Manually finalize proposal (anyone can call after voting period)
(define-public (finalize-proposal-manual (proposal-id uint))
  (let 
    (
      (proposal-data (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
    )
    (asserts! (>= stacks-block-height (get voting-ends-at proposal-data)) err-voting-ended)
    (asserts! (is-eq (get status proposal-data) proposal-active) err-proposal-already-executed)
    
    (finalize-proposal proposal-id)
  )
)

;; Read-only functions

;; Get DAO member status
(define-read-only (get-dao-member-status (member principal))
  {
    is-member: (is-dao-member member),
    member-count: (var-get dao-member-count),
    activity: (map-get? member-activity member)
  }
)

;; Get proposal details
(define-read-only (get-proposal (proposal-id uint))
  (map-get? proposals proposal-id)
)

;; Get vote details
(define-read-only (get-vote (proposal-id uint) (voter principal))
  (map-get? proposal-votes {proposal-id: proposal-id, voter: voter})
)

;; Get proposal voting summary
(define-read-only (get-proposal-summary (proposal-id uint))
  (match (map-get? proposals proposal-id)
    proposal-data (some {
      yes-votes: (get yes-votes proposal-data),
      no-votes: (get no-votes proposal-data),
      abstain-votes: (get abstain-votes proposal-data),
      total-voters: (get total-eligible-voters proposal-data),
      required-threshold: (calculate-vote-threshold (get total-eligible-voters proposal-data)),
      status: (get status proposal-data),
      voting-ends-at: (get voting-ends-at proposal-data),
      is-active: (is-proposal-active proposal-id)
    })
    none
  )
)

;; Get DAO statistics
(define-read-only (get-dao-stats)
  {
    total-members: (var-get dao-member-count),
    max-members: max-dao-members,
    next-proposal-id: (var-get next-proposal-id),
    supermajority-threshold: supermajority-threshold
  }
)

;; Get contract references
(define-read-only (get-contract-references)
  {
    membership-contract: (var-get membership-contract),
    escrow-contract: (var-get escrow-contract),
    dispute-contract: (var-get dispute-contract)
  }
)

