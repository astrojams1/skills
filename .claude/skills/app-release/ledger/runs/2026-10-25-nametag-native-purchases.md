# Nametag native purchase recovery — 2026-10-25

The earlier XCTest failure was attributed to simulator services. Correlated
dtarbiter logs instead showed the copied, ad-hoc-signed xcodebuild client denied
with -67050. Strict signature validation passed for that copy; Apple's code
requirement and required entitlements did not. The original selected Apple tool
passed all checks. The shared preflight now detects this failure without running
the candidate launcher.

A simulator-only host compiled unchanged production purchase, shop and design
code with Apple's StoreKitTest framework and the app's actual configuration.
The repeatable runner passed 16 checks on the owned SSD iOS 18.4 simulator:
product loading, configured prices, verified pack/Studio access, restore, refunds,
transaction updates, pending approval, network errors and cancellation. Developer
framework paths fixed the direct host's missing XCTest dependency. This is local
StoreKit/controller evidence, not TestFlight transaction or UI gesture evidence.
The already completed owner check of unchanged TestFlight 1.0 build 1 remains valid.

A separate clean load-only launch produced the real shop screenshot, inspected
before upload. The new API command uploaded it to both app-owned IAPs; readback
reported COMPLETE with matching MD5 and both products READY_TO_SUBMIT. The first
authorized review attempt then returned APP_DATA_USAGES_REQUIRED: App Privacy
answers must be published. The UI connector exposed no usable native/browser
surface; prepared answers were not reported as publication. Neither App Review
submission nor public launch is complete.

Source of current truth: [Nametag ledger](https://github.com/astrojams1/nametag/blob/main/store/ledger.json)
and [native StoreKit provenance](https://github.com/astrojams1/nametag/blob/main/store/source/storekit-qa.json).
No production app code, Apple tool, default simulator or account security was
changed. No actual-money transaction or paid service was used. Token/dollar cost
is unavailable.
