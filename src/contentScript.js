'use strict';
import Browser from "webextension-polyfill";
import { cleanHTML } from "./utils";

Browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'get_html') {
    sendResponse({ success: true, html: cleanHTML(document) });
  }

  if (request.action === 'set_element_value') {
    setElementValue(request.id, request.name, request.value);
    sendResponse({ success: true });
  }
});

const setElementValue = async (id, name, value) => {
  let element = undefined;

  if (id) {
    element = document.getElementById(id);
  }

  if (!element && name) {
    element = document.querySelector(`[name="${name}"]`);
  }

  if (!element || !element.tagName) {
    sendResponse({ success: false, error: 'Element not found' });
  }

  if (element.tagName === 'SELECT') {
    for (let i = 0; i < element.options.length; i++) {
      console.log(element.options[i].value, value, element.options[i].textContent, value);

      if (element.options[i].value === value || element.options[i].textContent === value) {
        element.options.selectedIndex = i;
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        break;
      }
    }
  } else if (element.tagName === 'INPUT' && element.type === 'radio') {
    const radioButtons = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
    let selectedRadio;
    radioButtons.forEach(radio => {
      if (radio.value === value) {
        selectedRadio = radio;
      } else if (!selectedRadio && (radio.id === (id || '') || radio.name === (name || ''))) {
        selectedRadio = radio;
      }
    });
    if (selectedRadio) {
      selectedRadio.checked = true;
      selectedRadio.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
      selectedRadio.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      selectedRadio.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }
  } else if (element.tagName === 'INPUT' && element.type === 'checkbox') {
    element.checked = value === true || value === 'true';
    element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    element.value = value;
    const event = new Event('input', { bubbles: true, cancelable: true });
    event.simulated = true;
    element.dispatchEvent(event);
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
  }
}
