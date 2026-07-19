# AFTERBEFORE — AXP PARTNER REWARDS & QR REDEMPTION MODEL

**Status:** Loyalty & Partner Reward Model  
**Scope:** AXP usage at partner venues through QR redemption  
**Primary Principle:** AXP is a closed-loop loyalty benefit used only for predefined rewards within the AfterBefore partner network.

---

## 1. Core Thesis

AXP should not initially function as money, crypto, a transferable balance, or a cash-equivalent currency.

The safer and more practical model is:

> **Users earn AXP through verified participation and spend it only on predefined rewards offered by contracted AfterBefore partners.**

Examples:

- one drink,
- cloakroom access,
- line skip,
- event ticket,
- coffee,
- merchandise,
- recovery perk,
- discount,
- special access,
- limited partner reward.

The user does not pay with AXP in the legal sense.

Instead, AXP unlocks a specific partner benefit.

---

## 2. Recommended Positioning

Use the term:

> **AXP Partner Rewards**

Avoid presenting the feature as:

- AXP payments,
- AXP wallet,
- digital money,
- crypto,
- user balance with cash value,
- exchangeable currency.

Recommended wording:

> “Earn AXP through real participation and unlock rewards at selected AfterBefore partner venues.”

---

## 3. Closed Partner Network

AXP is used only within a predefined network of AfterBefore partners.

Possible partners include:

- clubs,
- bars,
- cafes,
- cultural centers,
- alternative venues,
- festivals,
- pop-up organizers,
- domestic brands,
- recovery and wellness partners,
- fashion and merchandise partners.

Each partner defines:

- available reward,
- AXP requirement,
- quantity,
- time window,
- eligibility,
- redemption limit,
- age conditions,
- location conditions.

---

## 4. Example — Drugstore Beer Reward

Drugstore creates the following offer:

```text
Reward: 1 beer
AXP required: 1,500
Quantity: first 30 redemptions
Available: Friday, 23:00–01:00
Conditions:
- 18+
- verified event check-in
- one redemption per user
```

The user opens the reward inside the app and redeems it at the venue.

---

## 5. QR Redemption Flow

```text
User checks in at partner venue
→ opens AXP Rewards
→ selects available reward
→ app generates a one-time QR code
→ venue staff scans the QR
→ server validates eligibility
→ user confirms redemption
→ AXP is deducted
→ reward is issued
→ redemption is recorded
```

### Validation Checks

Before approval, the system confirms:

- active account,
- valid partner venue,
- reward availability,
- enough AXP,
- active time window,
- verified check-in,
- age eligibility where required,
- quantity limit,
- one-time QR validity,
- user redemption limit,
- no suspicious activity.

---

## 6. QR Security

The QR code should not be static.

Recommended implementation:

- one-time QR token,
- short expiration period,
- server-side validation,
- venue-specific reward ID,
- user confirmation before deduction,
- anti-replay protection,
- audit log,
- staff confirmation screen,
- automatic expiration after use.

A screenshot of an old QR should not work.

---

## 7. Partner Mode

Partner staff should have a lightweight scanning interface.

Possible formats:

- AfterBefore Partner app,
- mobile web scanner,
- staff dashboard,
- venue tablet mode.

The screen should show only necessary information:

- reward name,
- valid / invalid status,
- remaining quantity,
- user eligibility,
- confirmation button,
- redemption timestamp.

Staff should not see unnecessary personal user data.

---

## 8. Three Commercial Models

### 8.1 Venue-Funded Reward

The venue provides the reward from its own marketing budget.

Example:

- Drugstore provides 30 beers,
- AfterBefore brings verified users,
- AXP controls eligibility,
- venue receives analytics.

Advantages:

- simplest pilot,
- no reimbursement,
- lower legal and accounting complexity,
- venue controls inventory,
- easy to test.

This is the recommended first model.

---

### 8.2 Sponsor-Funded Reward

A brand finances the reward.

Example:

```text
Beer brand funds 100 products
→ venue distributes them
→ users unlock them with AXP
→ AfterBefore runs the campaign
```

The sponsor receives:

- campaign participation,
- verified visits,
- redemptions,
- UGC,
- engagement,
- analytics.

AfterBefore earns campaign revenue.

---

### 8.3 AfterBefore-Reimbursed Reward

The partner issues the product, and AfterBefore later reimburses the venue.

This model introduces:

- monthly settlement,
- invoicing,
- accounting treatment,
- budget reserves,
- fraud risk,
- disputes,
- reconciliation.

This should be considered only after the venue-funded model is proven.

---

## 9. AXP Must Not Have Fixed Cash Value

Avoid public conversion such as:

```text
100 AXP = 100 RSD
```

Better structure:

```text
1,500 AXP → one specific partner reward
5,000 AXP → two event tickets
700 AXP → line skip
800 AXP → cloakroom
600 AXP → coffee or recovery perk
```

The reward value may vary by partner, campaign and availability.

This keeps AXP as a loyalty and eligibility system rather than a parallel currency.

---

## 10. How Users Earn AXP

AXP may be earned through verified actions such as:

- event check-ins,
- completed quests,
- approved content contributions,
- verified venue suggestions,
- event verification,
- useful Weekend Roadmaps,
- sponsored quest participation,
- care quests,
- referrals that become active users,
- community contributions,
- Raverboard milestones.

AXP should not be created through unverified spam activity.

---

## 11. Reward Inventory

Every reward should include:

- partner,
- reward type,
- AXP price,
- total quantity,
- remaining quantity,
- start date,
- end date,
- redemption location,
- user limit,
- age restriction,
- check-in requirement,
- sponsor label where applicable.

Once inventory reaches zero, the reward closes automatically.

---

## 12. Alcohol-Related Rewards

Alcohol rewards require stricter controls.

Possible safeguards:

- 18+ verification,
- one alcohol reward per user per night,
- active venue check-in,
- time-limited availability,
- partner staff approval,
- no stacking,
- no reward for risky behavior,
- no AXP reward based on drinking volume.

For the first technical pilot, simpler rewards are recommended:

- water,
- non-alcoholic drink,
- coffee,
- cloakroom,
- line skip,
- ticket,
- merchandise,
- recovery benefit.

Alcohol can be added after legal, operational and fiscal review.

---

## 13. Fiscal and Accounting Principle

The venue should still follow its regular fiscal and accounting obligations.

The exact treatment depends on the commercial structure:

- venue-funded promotion,
- sponsor-funded promotion,
- discount,
- free promotional product,
- AfterBefore reimbursement.

Before launch, a Serbian accountant and lawyer should confirm:

- receipt treatment,
- VAT treatment,
- promotional inventory treatment,
- partner invoicing,
- reimbursement rules,
- sponsor campaign structure.

---

## 14. Legal Risk Boundary

The safest AXP structure includes:

- no user cash deposit,
- no cash-out,
- no transfer between users,
- no resale,
- no guaranteed dinar value,
- no exchange outside partner network,
- no interest or financial return,
- rewards subject to availability,
- clear loyalty terms.

The model should be reviewed as a limited partner reward network rather than a general payment system.

If transaction volume becomes significant, the company should obtain formal legal guidance on whether notification or consultation with the National Bank of Serbia is required.

---

## 15. Terms of Use Principles

The terms should clearly state:

- AXP has no cash value,
- AXP cannot be exchanged for money,
- AXP cannot be transferred,
- AXP cannot be sold,
- rewards depend on partner availability,
- partners define reward limits,
- AXP may expire under transparent rules,
- fraud may result in canceled redemption,
- suspended accounts may lose reward eligibility,
- AfterBefore may change reward catalogs with notice.

---

## 16. Anti-Fraud Controls

The system should prevent:

- duplicated QR codes,
- screenshot reuse,
- multiple accounts,
- fake check-ins,
- staff self-redemption,
- reward inventory manipulation,
- automated AXP farming,
- referral abuse,
- repeated redemption.

Recommended controls:

- rotating one-time QR,
- device and account risk signals,
- geofence validation,
- server-side timestamps,
- partner staff audit trail,
- user confirmation,
- daily redemption limits,
- anomaly alerts.

---

## 17. Partner Analytics

Partners may receive:

- number of reward views,
- reward saves,
- redemption count,
- redemption time,
- first-time visitors,
- returning visitors,
- quest participants,
- AXP used,
- inventory used,
- campaign conversion,
- repeat visit behavior.

Do not claim direct revenue attribution unless POS or ticketing integration exists.

---

## 18. Business Value

### For Users

- real value from participation,
- rewards without paying cash,
- stronger motivation,
- status and progression,
- partner access.

### For Venues

- verified foot traffic,
- weak-day activation,
- customer acquisition,
- loyalty,
- campaign analytics,
- controlled reward inventory.

### For Sponsors

- measurable product sampling,
- cultural relevance,
- verified participation,
- UGC,
- campaign reporting.

### For AfterBefore

- partner revenue,
- sponsor revenue,
- retention,
- reward economy,
- stronger network effects,
- measurable venue value.

---

## 19. Reward Pool Funding

The reward economy may be funded by:

```text
venue subscriptions
+ sponsored quest revenue
+ brand campaign budgets
+ partner-funded inventory
→ AXP reward pool
```

The platform should not promise a fixed monetary liability for every outstanding AXP.

AXP unlocks available rewards rather than representing debt owed in money.

---

## 20. Pilot Plan

### Phase 1 — Technical Pilot

Partners:

- 1 club,
- 1 cafe,
- 1 cultural venue.

Rewards:

- water,
- cloakroom,
- coffee,
- line skip,
- ticket.

Measure:

- redemption success,
- scanning time,
- fraud attempts,
- user confusion,
- staff usability,
- reward conversion.

### Phase 2 — Partner Campaign

Add:

- sponsor-funded rewards,
- limited inventory,
- QR activation,
- quest-linked eligibility.

### Phase 3 — Expanded Network

Add:

- multiple venues,
- dynamic reward catalog,
- venue dashboard,
- sponsor dashboard,
- settlement only where necessary.

---

## 21. Core MVP Recommendation

The first version should use:

- venue-funded rewards,
- closed partner network,
- one-time QR codes,
- no cash conversion,
- no user-to-user transfer,
- no AXP purchasing,
- no reimbursement complexity,
- simple non-alcoholic or access-based rewards.

---

## 22. Strategic Positioning

> **AXP converts contribution into real partner privileges.**

Alternative pitch formulation:

> **Users earn AXP by creating value for the scene and redeem it for limited rewards at selected partner venues.**

---

## 23. Final Model

```text
User contributes
→ earns AXP
→ discovers partner reward
→ checks in at venue
→ generates one-time QR
→ venue validates
→ AXP is deducted
→ partner issues reward
→ all sides receive measurable value
```

The strongest summary is:

> **AXP is not money. It is a closed-loop loyalty layer that turns verified participation into real-world privileges across the AfterBefore partner network.**
