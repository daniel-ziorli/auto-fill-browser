'use strict';
import Browser from "webextension-polyfill";
import { cleanHTML } from "./utils";

Browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'get_html') {
    sendResponse({ success: true, html: cleanHTML(document.body.outerHTML) });
  }

  if (request.action === 'set_element_value') {
    let element = document.getElementById(request.id);

    if (!element) {
      element = document.querySelector(`[name="${request.name}"]`);
    }
    if (!element) {
      sendResponse({ success: false, error: 'Element not found' });
    }

    if (element.tagName === 'SELECT') {
      for (let i = 0; i < element.options.length; i++) {
        if (element.options[i].value === request.value) {
          element.options.selectedIndex = i;
          element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          break;
        }
      }
    } else if (element.tagName === 'INPUT' && element.type === 'radio') {
      const radioButtons = document.querySelectorAll(`input[type="radio"][name="${element.name}"]`);
      let selectedRadio;
      radioButtons.forEach(radio => {
        if (radio.value === request.value) {
          selectedRadio = radio;
        } else if (!selectedRadio && radio.id === request.id) {
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
      element.checked = request.value === true || request.value === 'true';
      element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      element.value = request.value;
      const event = new Event('input', { bubbles: true, cancelable: true });
      event.simulated = true;
      element.dispatchEvent(event);
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }
    sendResponse({ success: true });
  }
});

