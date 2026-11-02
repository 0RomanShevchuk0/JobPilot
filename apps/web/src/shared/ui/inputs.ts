// red border while the input has an error: inside a Field that shows one, or marked aria-invalid itself
export const inputClasses =
   "w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 shadow-xs transition-colors hover:border-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none group-data-invalid:border-red-400 aria-invalid:border-red-400";

// grows with its text up to a point, then scrolls: a long skills list doesn't stretch the page
export const textareaClasses = `field-sizing-content min-h-20 max-h-72 ${inputClasses}`;
