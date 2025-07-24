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

const A_WEIGHT = 1;
const AA_WEIGHT = 2;
const AAA_WEIGHT = 4;

const PREFERENCE_WEIGHTS = {
  '(prefers-reduced-motion: reduce)': A_WEIGHT,
  '(prefers-contrast: more)': AA_WEIGHT,
  '(prefers-contrast: high)': AA_WEIGHT,
  '(forced-colors: active)': AAA_WEIGHT,
  '(-ms-high-contrast: active)': AAA_WEIGHT,
  '(prefers-reduced-transparency: reduce)': A_WEIGHT,
};

const KEYBOARD_RELEVANT_KEYS = [
  'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape',
];

const HIGH_ZOOM_LEVEL = 200;
const MEDIUM_ZOOM_LEVEL = 125;

const BEHAVIORAL_MIN_EVENTS = 10;

const FOCUSTRAP_MAX_HISTORY = 25;
const FOCUS_TRAP_MIN_HISTORY = 4;
const FOCUS_TRAP_PING_PONG_DURATION = 3000;
const FOCUS_TRAP_MIN_REPEATS = 3;

/**
 * Detects approximate zoom level using the Visual Viewport API.
 * This is a pure utility function.
 * @returns {Number} Estimated zoom percentage.
 */
function getZoom() {
  if (window.visualViewport && window.visualViewport.width > 0) {
    return Math.round((window.innerWidth / window.visualViewport.width) * 100);
  }
  /* c8 ignore next 1 */
  return 100;
}

/**
 * Minimal accessibility audience detection plugin for helix-rum-enhancer.
 * @param {Object} params Plugin parameters from enhancer.
 * @param {Function} params.sampleRUM RUM tracking function.
 * @param {Function} params.sourceSelector Function to generate a selector for an element.
 */
export default function addAccessibilityAudienceTracking({ sampleRUM, sourceSelector }) {
  const focusHistory = [];
  let score = 0;
  let reported = false;
  let focusTrapDetected = false;
  let keyboardCount = 0;
  let totalCount = 0;
  let lastFocusTime = 0;
  let hadMeaningfulFocus = false;

  const reportAudience = () => {
    /* c8 ignore next 3 */
    if (reported) {
      return;
    }
    reported = true;
    let audience = 'off';
    if (score > 7) {
      audience = 'high';
    } else if (score >= 4) {
      audience = 'medium';
    } else if (score >= 1) {
      audience = 'low';
    }
    sampleRUM('a11y', { source: audience, target: 'off:low:medium:high' });
  };

  const reportFocusTrap = (trapType, elements) => {
    /* c8 ignore next 3 */
    if (focusTrapDetected) {
      return;
    }
    focusTrapDetected = true;
    const elementDescriptions = elements.slice(0, 3).map(sourceSelector);
    sampleRUM('error', {
      source: `focus-trap:${trapType}`,
      target: elementDescriptions.join(', '),
    });
  };

  const detectRepeatingSequence = (elements, seqLength) => {
    const totalLength = seqLength * FOCUS_TRAP_MIN_REPEATS;
    /* c8 ignore next 3 */
    if (elements.length < totalLength) {
      return false;
    }
    const recent = elements.slice(-totalLength);
    const baseSequence = recent.slice(0, seqLength);
    for (let i = 1; i < FOCUS_TRAP_MIN_REPEATS; i += 1) {
      const nextSequence = recent.slice(i * seqLength, (i + 1) * seqLength);
      if (nextSequence.length !== seqLength
        || !nextSequence.every((el, j) => el === baseSequence[j])) {
        return false;
      }
    }
    reportFocusTrap('sequence', baseSequence);
    return true;
  };

  const detectFocusTrap = () => {
    if (focusHistory.length < FOCUS_TRAP_MIN_HISTORY || focusTrapDetected) {
      return;
    }
    const elements = focusHistory.map((h) => h.element);
    const timestamps = focusHistory.map((h) => h.timestamp);

    if (elements.slice(-3).every((el) => el === elements[elements.length - 1])) {
      reportFocusTrap('single', [elements[elements.length - 1]]);
      return;
    }

    const recent4 = elements.slice(-4);
    const unique = [...new Set(recent4)];
    const timeDiff = timestamps[timestamps.length - 1] - timestamps[timestamps.length - 4];
    if (unique.length === 2 && timeDiff < FOCUS_TRAP_PING_PONG_DURATION) {
      reportFocusTrap('ping-pong', unique);
      return;
    }

    const minSeqLength = 2 * FOCUS_TRAP_MIN_HISTORY + 1;
    if (focusHistory.length >= minSeqLength) {
      for (let seqLength = 2; seqLength <= 4; seqLength += 1) {
        if (detectRepeatingSequence(elements, seqLength)) {
          return;
        }
      }
    }
  };

  const trackFocusForTrap = (event) => {
    setTimeout(() => {
      const { activeElement } = document;
      /* c8 ignore next 3 */
      if (!activeElement || activeElement === document.body) {
        return;
      }
      focusHistory.push({
        element: activeElement,
        timestamp: performance.now(),
        shiftKey: event.shiftKey,
      });
      /* c8 ignore next 3 */
      if (focusHistory.length > FOCUSTRAP_MAX_HISTORY) {
        focusHistory.shift();
      }
      detectFocusTrap();
    }, 0);
  };

  const checkBehavioralScore = () => {
    if (totalCount >= BEHAVIORAL_MIN_EVENTS && !reported) {
      if (keyboardCount / totalCount > 0.7) {
        score += AAA_WEIGHT;
        console.log('keyboard', score);
      }
      reportAudience();
    }
  };

  // --- Static Scoring ---
  Object.entries(PREFERENCE_WEIGHTS).forEach(([query, queryWeight]) => {
    if (window.matchMedia(query).matches) {
      score += queryWeight;
      console.log('preference', query, score);
    }
  });

  const zoom = getZoom();
  if (zoom >= HIGH_ZOOM_LEVEL) {
    score += AA_WEIGHT;
    console.log('high zoom', score);
  } else if (zoom >= MEDIUM_ZOOM_LEVEL) {
    score += A_WEIGHT;
    console.log('medium zoom', score);
  }

  if (navigator.maxTouchPoints === 0 && window.matchMedia('(pointer: coarse)').matches) {
    score += AA_WEIGHT;
    console.log('pointer', score);
  }

  if (window.matchMedia('(hover: none)').matches) {
    score += AA_WEIGHT;
    console.log('hover', score);
  }

  // --- Event Listeners & Observers ---
  document.addEventListener('keydown', (event) => {
    if (KEYBOARD_RELEVANT_KEYS.includes(event.key)) {
      keyboardCount += 1;
      totalCount += 1;
      if (event.key === 'Tab') {
        trackFocusForTrap(event);
      }
      checkBehavioralScore();
    }
  });

  document.addEventListener('click', () => {
    totalCount += 1;
    checkBehavioralScore();
  });

  document.addEventListener('focusin', (event) => {
    if (event.target !== document.body) {
      lastFocusTime = performance.now();
      hadMeaningfulFocus = true;
    }
  });

  const focusLossObserver = new MutationObserver((mutations) => {
    if (hadMeaningfulFocus
        && document.activeElement === document.body
        && (performance.now() - lastFocusTime > 100)) {
      /* c8 ignore next 9 */
      const mutation = mutations.find((m) => (
        m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
      ));
      sampleRUM('error', {
        source: 'focus-loss',
        target: sourceSelector(mutation?.target),
      });
      hadMeaningfulFocus = false; // Prevent spam
    }
  });

  focusLossObserver.observe(document, { childList: true, subtree: true });

  // --- Final Reporting ---
  if (score >= 7) {
    reportAudience();
  } else {
    setTimeout(
      () => reportAudience(),
      /* c8 ignore next 1 */
      window.hlx.A11Y_REPORT_DELAY || 10_000,
    );
  }
}
