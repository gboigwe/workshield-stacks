;; WorkShield Payment Processing Contract
;; Handles platform fees, user tiers, and payment processing

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u200))
(define-constant err-not-authorized (err u201))
(define-constant err-insufficient-funds (err u202))
(define-constant err-invalid-tier (err u203))
(define-constant err-limit-exceeded (err u204))

;; Fee Constants (in basis points, 100 = 1%)
(define-constant platform-fee-rate u150) ;; 1.5%
(define-constant basis-points u10000)

;; Tier Constants
(define-constant tier-free u0)
(define-constant tier-pro u1)

;; Free Tier Limits
(define-constant free-tier-max-contracts u3)
(define-constant free-tier-max-amount u100000000) ;; 100 STX in microSTX

;; Data Variables
(define-data-var platform-treasury principal tx-sender)
(define-data-var total-platform-fees uint u0)

;; Data Maps
(define-map user-tiers principal uint)
(define-map user-stats principal {
  total-contracts: uint,
  total-volume: uint,
  contracts-this-month: uint,
  last-reset: uint
})

(define-map tier-limits uint {
  max-contracts: uint,
  max-amount: uint,
  monthly-fee: uint
})

;; Initialize tier limits
(map-set tier-limits tier-free {
  max-contracts: free-tier-max-contracts,
  max-amount: free-tier-max-amount,
  monthly-fee: u0
})

(map-set tier-limits tier-pro {
  max-contracts: u999999, ;; Unlimited
  max-amount: u999999999999, ;; Very high limit
  monthly-fee: u9990000 ;; $9.99 in microSTX (approximate)
})

;; Private Functions
(define-private (get-user-tier (user principal))
  (default-to tier-free (map-get? user-tiers user))
)

(define-private (get-user-stats (user principal))
  (default-to {
    total-contracts: u0,
    total-volume: u0,
    contracts-this-month: u0,
    last-reset: u0
  } (map-get? user-stats user))
)

(define-private (should-reset-monthly-stats (user principal))
  (let ((stats (get-user-stats user))
        (current-time stacks-block-height))
    ;; Reset if more than 30 days (approximate block time)
    (> (- current-time (get last-reset stats)) u4320) ;; ~30 days in blocks (assuming 1 block ~10 minutes, 4320 blocks ~30 days)
  )
)

(define-private (reset-monthly-stats (user principal))
  (let ((stats (get-user-stats user))
        (current-time stacks-block-height))
    (map-set user-stats user (merge stats {
      contracts-this-month: u0,
      last-reset: current-time
    }))
  )
)

;; Public Functions

;; Set user tier (owner only for now, later can be automated)
(define-public (set-user-tier (user principal) (tier uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (or (is-eq tier tier-free) (is-eq tier tier-pro)) err-invalid-tier)
    
    (map-set user-tiers user tier)
    (ok true)
  )
)

;; Upgrade to pro tier (pay monthly fee)
(define-public (upgrade-to-pro)
  (let ((tier-data (unwrap! (map-get? tier-limits tier-pro) err-invalid-tier))
        (monthly-fee (get monthly-fee tier-data)))
    
    ;; Transfer monthly fee to platform treasury
    (try! (stx-transfer? monthly-fee tx-sender (var-get platform-treasury)))
    
    ;; Update user tier
    (map-set user-tiers tx-sender tier-pro)
    
    ;; Update platform fees
    (var-set total-platform-fees (+ (var-get total-platform-fees) monthly-fee))
    
    (ok true)
  )
)

;; Process contract creation with tier validation
(define-public (validate-contract-creation (user principal) (amount uint))
  (let ((user-tier (get-user-tier user))
        (tier-data (unwrap! (map-get? tier-limits user-tier) err-invalid-tier))
        (stats-before (get-user-stats user)))
    
    ;; Reset monthly stats if needed
    (if (should-reset-monthly-stats user)
      (reset-monthly-stats user)
      true
    )
    
    ;; Get updated stats
    (let ((updated-stats (get-user-stats user)))
      ;; Check limits
      (asserts! (< (get contracts-this-month updated-stats) (get max-contracts tier-data)) err-limit-exceeded)
      (asserts! (<= amount (get max-amount tier-data)) err-limit-exceeded)
      
      ;; Update user stats
      (map-set user-stats user (merge updated-stats {
        total-contracts: (+ (get total-contracts updated-stats) u1),
        total-volume: (+ (get total-volume updated-stats) amount),
        contracts-this-month: (+ (get contracts-this-month updated-stats) u1)
      }))
      
      (ok true)
    )
  )
)

;; Calculate platform fee
(define-public (calculate-platform-fee (user principal) (amount uint))
  (let ((user-tier (get-user-tier user)))
    (if (is-eq user-tier tier-pro)
      ;; Pro users pay transaction fee
      (ok (/ (* amount platform-fee-rate) basis-points))
      ;; Free users pay no fee
      (ok u0)
    )
  )
)

;; Process platform fee payment
(define-public (process-platform-fee (user principal) (amount uint))
  (let ((fee-amount (unwrap! (calculate-platform-fee user amount) err-insufficient-funds)))
    (if (> fee-amount u0)
      (begin
        ;; Transfer fee to platform treasury
        (try! (stx-transfer? fee-amount user (var-get platform-treasury)))
        
        ;; Update total platform fees
        (var-set total-platform-fees (+ (var-get total-platform-fees) fee-amount))
        
        (ok fee-amount)
      )
      (ok u0)
    )
  )
)

;; Owner Functions

;; Update platform treasury address
(define-public (set-platform-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set platform-treasury new-treasury)
    (ok true)
  )
)

;; Withdraw platform fees
(define-public (withdraw-platform-fees (amount uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (<= amount (var-get total-platform-fees)) err-insufficient-funds)
    
    (try! (as-contract (stx-transfer? amount tx-sender (var-get platform-treasury))))
    (var-set total-platform-fees (- (var-get total-platform-fees) amount))
    
    (ok true)
  )
)

;; Read-only Functions

;; Get user tier
(define-read-only (get-user-tier-info (user principal))
  {
    tier: (get-user-tier user),
    stats: (get-user-stats user)
  }
)

;; Get tier limits
(define-read-only (get-tier-info (tier uint))
  (map-get? tier-limits tier)
)

;; Get platform stats
(define-read-only (get-platform-stats)
  {
    total-fees: (var-get total-platform-fees),
    treasury: (var-get platform-treasury)
  }
)

;; Check if user can create contract
(define-read-only (can-create-contract (user principal) (amount uint))
  (let ((user-tier (get-user-tier user))
        (tier-data (map-get? tier-limits user-tier))
        (stats (get-user-stats user)))
    (match tier-data
      data (and 
        (< (get contracts-this-month stats) (get max-contracts data))
        (<= amount (get max-amount data))
      )
      false
    )
  )
)
