# Guest and account wishlist

Approved in chat: wishlist hearts on card images (top right) and PDP purchase controls, navbar access on mobile and desktop, and a dedicated wishlist page. Guests can save without signing in; accounts sync across devices.

Guest product IDs persist in browser storage. Account product IDs persist as independent `mm_wishlist_<productId>` boolean metadata entries on the existing WooCommerce customer. Independent product mutations avoid replacing a stale whole-list snapshot. Same-product concurrent edits use last-write-wins. All account access derives customer ID from the encrypted session, never request input. Private responses are not cached.

Sign-in/registration merges guest saves with account saves, deduplicating IDs. Guest IDs are removed only following successful writes. A customer-scoped local pending journal retains failed additions and removals for retry; it is never shown or merged into another customer's list. Sign-out returns to the separate guest list. Synchronize on navigation, window focus and storage changes. The UI reports failed sync and offers retry.

Save whole products; variants are selected at purchase. Wishlist resolves fresh public product data in batches, with no fake catalog fallback. Deleted/private products remain removable by ID. Simple products use the existing cart action; variable products link to their PDP. Adding to cart does not remove a saved item.

Hearts have 44px targets, accessible labels and pressed state. Navbar and card controls work at 320px. Card hearts do not navigate or interfere with swipe galleries. No new dependencies, databases, public customer identifiers, or production deployment are required.

Verify normalization, merge, independent writes, failed sync, guest persistence, real encrypted sessions against a local WooCommerce fixture, two browser contexts, logout isolation, image galleries, cart flows, lint, types and build. Prepare a preview after review; production requires the user's release instruction.
