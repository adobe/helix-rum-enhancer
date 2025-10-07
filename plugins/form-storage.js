/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const STORAGE_KEY = 'helix-rum-form-events';
const MAX_EVENTS = 100; // Prevent localStorage from getting too large

// Storage utility functions
const storage = {
  get() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to read form events from localStorage:', e);
      return [];
    }
  },

  set(events) {
    try {
      // Keep only the most recent events to prevent localStorage overflow
      const trimmedEvents = events.slice(-MAX_EVENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedEvents));
    } catch (e) {
      console.warn('Failed to store form events to localStorage:', e);
    }
  },

  add(event) {
    const events = this.get();
    events.push({
      ...event,
      timestamp: Date.now(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });
    this.set(events);
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear form events from localStorage:', e);
    }
  }
};

// Check if an element is inside a form
function isInsideForm(element) {
  return element.closest('form') !== null;
}

// Get form context for an element
function getFormContext(element) {
  const form = element.closest('form');
  if (!form) return null;
  
  return {
    formId: form.id || 'unnamed-form',
    formAction: form.action || '',
    formMethod: form.method || 'GET',
    elementName: element.name || element.id || 'unnamed-element',
    elementType: element.type || element.tagName.toLowerCase()
  };
}

// Force send events bypassing sampling
function forceSendEvents(sampleRUM, events) {
  events.forEach(event => {
    try {
      // Force send by calling sampleRUM directly
      sampleRUM(event.checkpoint, {
        target: event.target,
        source: event.source,
        ...event.data
      });
    } catch (e) {
      console.warn('Failed to force send form event:', e);
    }
  });
}

export default function addFormStorageTracking({
  sampleRUM, sourceSelector, targetSelector, context, getIntersectionObserver
}) {
  // Track form-related events and store them in localStorage
  context.querySelectorAll('form').forEach((form) => {
    // Store form view events
    getIntersectionObserver('viewblock').observe(form);
    
    // Track form interactions and store in localStorage
    let lastSource;
    
    // Track form field changes
    form.addEventListener('change', (e) => {
      if (e.target.checkVisibility && e.target.checkVisibility()) {
        const source = sourceSelector(e.target);
        if (source !== lastSource) {
          const formContext = getFormContext(e.target);
          if (formContext) {
            storage.add({
              checkpoint: 'fill',
              source,
              target: targetSelector(e.target),
              data: { formContext }
            });
          }
          lastSource = source;
        }
      }
    });

    // Track form field focus
    form.addEventListener('focusin', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)
        || e.target.getAttribute('contenteditable') === 'true') {
        const source = sourceSelector(e.target);
        const formContext = getFormContext(e.target);
        if (formContext) {
          storage.add({
            checkpoint: 'click',
            source,
            target: targetSelector(e.target),
            data: { formContext }
          });
        }
      }
    });

    // Track form submission - this is the key part
    form.addEventListener('submit', (e) => {
      // Get all stored form events
      const storedEvents = storage.get();
      
      // Filter events related to this specific form
      const formEvents = storedEvents.filter(event => {
        const formContext = event.data?.formContext;
        return formContext && (
          formContext.formId === (form.id || 'unnamed-form') ||
          formContext.formAction === form.action ||
          // Fallback: check if event is recent (within last 5 minutes)
          (Date.now() - event.timestamp) < 5 * 60 * 1000
        );
      });

      // Force send all form-related events
      if (formEvents.length > 0) {
        console.log(`Force sending ${formEvents.length} form events for form submission`);
        forceSendEvents(sampleRUM, formEvents);
        
        // Clear the sent events from storage
        const remainingEvents = storedEvents.filter(event => 
          !formEvents.some(sentEvent => sentEvent.id === event.id)
        );
        storage.set(remainingEvents);
      }

      // Also send the formsubmit event normally (this will be subject to sampling)
      const formContext = getFormContext(e.target);
      if (formContext) {
        storage.add({
          checkpoint: 'formsubmit',
          source: sourceSelector(e.target),
          target: targetSelector(e.target),
          data: { formContext }
        });
      }
    }, { once: true });
  });

  // Optional: Clean up old events periodically
  setInterval(() => {
    const events = storage.get();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentEvents = events.filter(event => event.timestamp > oneHourAgo);
    
    if (recentEvents.length !== events.length) {
      storage.set(recentEvents);
    }
  }, 10 * 60 * 1000); // Clean up every 10 minutes
}
