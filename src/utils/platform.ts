/**
 * Platform detection utilities for mobile/touch device support.
 */

/** Returns true if the device supports touch input. */
export function isTouchDevice(): boolean {
    return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}

/** Returns true if the device is likely a mobile phone/tablet (touch + small screen). */
export function isMobile(): boolean {
    return isTouchDevice() && window.screen.width < 1024;
}
