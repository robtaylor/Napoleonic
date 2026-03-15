/**
 * Platform detection utilities for phone/tablet/desktop support.
 *
 * Device types:
 *   phone  — small touch screen (< 1024 logical px on short side)
 *   tablet — large touch screen (≥ 1024 logical px)
 *   desktop — no touch / keyboard+mouse
 */

export type DeviceType = "phone" | "tablet" | "desktop";

let cachedDevice: DeviceType | null = null;

/** Detect device type once and cache the result. */
export function getDeviceType(): DeviceType {
    if (cachedDevice) return cachedDevice;
    const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    if (!touch) {
        cachedDevice = "desktop";
    } else {
        // Use the shorter screen dimension to distinguish phone vs tablet
        const shortSide = Math.min(window.screen.width, window.screen.height);
        cachedDevice = shortSide >= 600 ? "tablet" : "phone";
    }
    return cachedDevice;
}

/** Returns true if the device supports touch input (phone or tablet). */
export function isTouchDevice(): boolean {
    return getDeviceType() !== "desktop";
}

/** Returns true if the device is a phone (small touch screen). */
export function isPhone(): boolean {
    return getDeviceType() === "phone";
}

/** Returns true if the device is a tablet (large touch screen). */
export function isTablet(): boolean {
    return getDeviceType() === "tablet";
}
