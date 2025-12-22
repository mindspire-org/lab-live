# Mindspire POS Software Activation Guide

## How to Get Your Activation Key

1. **Purchase the Software:**
   - Contact the official Mindspire team or your authorized vendor to purchase a license.
   - You will receive a unique activation key in the format: `mindspire-XXXXXXXXX` (e.g., `mindspire-137189347`).

2. **Receive Your Key:**
   - The activation key will be sent to you by email or provided in your purchase receipt.
   - Keep your key safe! Each key is unique and tied to your purchase.

3. **Activate the Software:**
   - On first launch, you will see the License Activation screen.
   - Enter your activation key exactly as provided (e.g., `mindspire-137189347`).
   - Click **Activate**. If the key is valid, the software will unlock and you can proceed to login and use all features.

4. **Offline Activation:**
   - No internet connection is required to activate. The activation is checked locally, so you can use the software even if your PC is offline.

5. **Deactivation:**
   - You can deactivate your software from the activation screen at any time. This will remove the key from your device.

6. **Lost or Invalid Key?**
   - If you lose your key or have trouble activating, contact Mindspire support with your purchase details.

---

## Important Notes
- **Do not share or resell your activation key.** Each key is for a single customer and device.
- The software will not run without a valid activation key.
- If you need to move your license to a new device, contact support for assistance.

---

# For Vendors/Support: How Activation Works (Technical Brief)

- The software checks for a valid license key in `localStorage` under the key `licenseKey`.
- The key must match the pattern: `mindspire-` followed by at least 9 digits (e.g., `mindspire-137189347`).
- No online check is performed (offline activation). All validation is local and instant.
- The activation screen blocks access to all features until a valid key is entered.
- Deactivation simply removes the key from `localStorage`.
- For enhanced security, you can implement a server-side verification or tie the key to a hardware ID in future versions.

---

**Thank you for choosing Mindspire!**
