/*
 * Copyright 2024 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

export const getSubmitType = (el) => {
  if (!el || el.tagName !== 'FORM') return undefined;
  // if the form has a search role or a search field, it's a search form
  if (el.getAttribute('role') === 'search'
    || el.querySelector('input[type="search"], input[role="searchbox"]')) return 'search';
  // if the form has one password input, it's a login form
  // if the form has more than one password input, it's a signup form
  const pwCount = el.querySelectorAll('input[type="password"]').length;
  if (pwCount === 1) return 'login';
  if (pwCount > 1) return 'signup';
  return 'formsubmit';
};

// Function to get field name for error tracking
const getFieldName = (field) => {
  return field.name || field.id;
};

// Function to detect form fields with validation errors
const getInvalidFields = (form) => {
  const invalidFields = [];
  
  // Trigger validation by calling checkValidity() first (if supported)
  // This ensures :invalid pseudo-class is applied
  if (typeof form.checkValidity === 'function') {
    form.checkValidity();
  }
  
  // Try to use :invalid pseudo-class first (modern browsers)
  let invalidFormFields;
  try {
    invalidFormFields = form.querySelectorAll(':invalid');
  } catch (e) {
    // Fallback for browsers that don't support :invalid pseudo-class
    invalidFormFields = [];
  }
  
  // If no invalid fields found with :invalid, fallback to checking validity manually
  if (invalidFormFields.length === 0) {
    const formFields = form.querySelectorAll('input, textarea, select');
    formFields.forEach((field) => {
      if (field.validity && !field.validity.valid) {
        invalidFormFields.push(field);
      }
    });
  }
  
  invalidFormFields.forEach((field) => {
    invalidFields.push({
      field,
      name: getFieldName(field)
    });
  });
  
  return invalidFields;
};

export default function addFormTracking({
  sampleRUM, sourceSelector, targetSelector, context, getIntersectionObserver,
}) {
  context.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      // Get invalid fields (this will trigger validation if needed)
      const invalidFields = getInvalidFields(e.target);
      
      if (invalidFields.length > 0) {
        // Form has validation errors - send error checkpoints for each invalid field
        invalidFields.forEach(({ name }) => {
          sampleRUM('error', { 
            target: name, 
            source: sourceSelector(e.target)
          });
        });
      }
      
      // Form is valid - send the regular form submit checkpoint
      sampleRUM(getSubmitType(e.target), { 
        target: targetSelector(e.target), 
        source: sourceSelector(e.target) 
      });
    }, { once: true });
    
    getIntersectionObserver('viewblock').observe(form);
    let lastSource;
    form.addEventListener('change', (e) => {
      if (e.target.checkVisibility && e.target.checkVisibility()) {
        const source = sourceSelector(e.target);
        if (source !== lastSource) {
          sampleRUM('fill', { source });
          lastSource = source;
        }
      }
    });
    form.addEventListener('focusin', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)
        || e.target.getAttribute('contenteditable') === 'true') {
        sampleRUM('click', { source: sourceSelector(e.target) });
      }
    });
  });
}
