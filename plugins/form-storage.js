/**
 * Form Storage Plugin
 * 
 * This plugin stores form-related events in localStorage when they're not sampled by RUM,
 * and sends all stored events when the form is submitted (if formsubmit is also not sampled).
 * This ensures we don't lose form interaction data due to sampling.
 */


const STORAGE_KEY = 'helix-rum-form-events';
const MAX_STORAGE_SIZE = 50; // Maximum number of events to store per session
const STORAGE_EXPIRY = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Check if localStorage is available and supported
 * @returns {boolean} True if localStorage is available
 */
function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get RUM session ID with proper null checks and browser compatibility
 * @returns {string} RUM session ID
 */
function getRumSessionId() {
  try {
    // Check if window.hlx exists and has rum property
    if (window.hlx && window.hlx.rum && window.hlx.rum.id) {
      return window.hlx.rum.id;
    }
  } catch (e) {
    // Handle cases where window.hlx might not be fully initialized
    console.warn('RUM session ID not available:', e);
  }
  
  // Fallback to a default session ID
  return 'default-session';
}

/**
 * Get storage key based on RUM session ID
 * @returns {string} Storage key
 */
function getStorageKey() {
  const rumSessionId = getRumSessionId();
  return `${STORAGE_KEY}-${rumSessionId}`;
}

/**
 * Get stored events from localStorage for the current session
 * @returns {Array} Array of stored events
 */
function getStoredEvents() {
  if (!isLocalStorageAvailable()) {
    return [];
  }
  
  try {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    
    const data = JSON.parse(stored);
    const now = Date.now();
    
    // Check if storage itself has expired
    if (data._expiry && now > data._expiry) {
      localStorage.removeItem(storageKey);
      return [];
    }
    
    // Return all events for the session
    return data.events || [];
  } catch (e) {
    console.warn('Failed to get stored form events:', e);
    return [];
  }
}

/**
 * Store an event in localStorage for the current session
 * @param {Object} eventData - The event data to store
 */
function storeEvent(eventData) {
  if (!isLocalStorageAvailable()) {
    return;
  }
  
  try {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : {};
    
    // Set storage expiry if not set
    if (!data._expiry) {
      data._expiry = Date.now() + STORAGE_EXPIRY;
    }
    
    // Initialize events array if not exists
    if (!data.events) {
      data.events = [];
    }
    
    // Add the event
    data.events.push({
      ...eventData,
      storedAt: Date.now()
    });
    
    // Limit the number of stored events for the session
    if (data.events.length > MAX_STORAGE_SIZE) {
      data.events = data.events.slice(-MAX_STORAGE_SIZE);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to store form event:', e);
  }
}

/**
 * Clear stored events for the current session
 */
function clearStoredEvents() {
  if (!isLocalStorageAvailable()) {
    return;
  }
  
  try {
    const storageKey = getStorageKey();
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.warn('Failed to clear stored form events:', e);
  }
}

/**
 * Single cleanup function - removes expired storage entries
 */
function cleanupExpiredStorage() {
  if (!isLocalStorageAvailable()) {
    return;
  }
  
  try {
    const storageKey = getStorageKey();
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return;
    
    const data = JSON.parse(stored);
    const now = Date.now();
    
    // Check if storage itself has expired
    if (data._expiry && now > data._expiry) {
      localStorage.removeItem(storageKey);
      return;
    }
    
    // Clean up expired events
    if (data.events && Array.isArray(data.events)) {
      const originalLength = data.events.length;
      data.events = data.events.filter(event => {
        return event.storedAt && (now - event.storedAt) <= STORAGE_EXPIRY;
      });
      
      // If events were removed, update storage
      if (data.events.length !== originalLength) {
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    }
  } catch (e) {
    console.warn('Failed to cleanup expired storage:', e);
  }
}


/**
 * Check if an element is inside a form
 * @param {Element} element - The element to check
 * @returns {boolean} True if element is inside a form
 */
function isInsideForm(element) {
  return element.closest('form') !== null;
}

/**
 * Enhanced sampleRUM function that stores form events when not sampled
 * @param {Function} originalSampleRUM - The original sampleRUM function
 * @param {string} checkpoint - The checkpoint name
 * @param {Object} data - The event data
 */
function enhancedSampleRUM(originalSampleRUM, checkpoint, data) {
  const element = findElementFromData(data);
  const isFormRelated = element && isInsideForm(element);
  
  if (isFormRelated) {
    storeEvent({
      checkpoint,
      data,
      timestamp: Date.now()
    });
    
    const formSubmitTypes = ['formsubmit'];
    if (formSubmitTypes.includes(checkpoint)) {
      const allStoredEvents = getStoredEvents();
      if (allStoredEvents.length > 0) {
        // Send stored events directly to RUM collector, bypassing sampling
        allStoredEvents.forEach(storedEvent => {
          if (window.hlx && window.hlx.rum && window.hlx.rum.collector) {
            window.hlx.rum.collector(storedEvent.checkpoint, storedEvent.data, storedEvent.timestamp);
          }
        });
        clearStoredEvents();
      }
    }
  }
  
  return originalSampleRUM(checkpoint, data);
}

/**
 * Find element from RUM data (source/target selectors)
 * @param {Object} data - RUM event data
 * @returns {Element|null} The element if found
 */
function findElementFromData(data) {
  if (!data || !data.source) return null;
  
  try {
    const element = document.querySelector(data.source);
    if (element) return element;
    
    if (data.target) {
      return document.querySelector(data.target);
    }
  } catch (e) {
    // Invalid selector, ignore
  }
  
  return null;
}

/**
 * Initialize form storage plugin
 * @param {Object} config - Plugin configuration
 * @param {Function} config.sampleRUM - The sampleRUM function
 */
export default function addFormStorage({ sampleRUM }) {
  // Override the sampleRUM function
  window.sampleRUM = (checkpoint, data) => {
    return enhancedSampleRUM(sampleRUM, checkpoint, data);
  };


  // Clean up expired events periodically
  setInterval(cleanupExpiredStorage, 30 * 60 * 1000);
}
