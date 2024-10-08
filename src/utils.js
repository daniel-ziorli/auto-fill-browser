import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import Browser from "webextension-polyfill";
export const readLocalStorage = async (key) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], function (result) {
      if (result[key] === undefined) {
        reject();
      } else {
        resolve(result[key]);
      }
    });
  });
};

export const writeLocalStorage = async (key, value) => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, function () {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
};

export const getHtmlFromActiveTab = async () => {
  const tab = (await Browser.tabs.query({ active: true, lastFocusedWindow: true, currentWindow: true }))[0];
  console.log('tab', tab);

  const response = await Browser.tabs.sendMessage(tab.id, { action: 'get_html' });
  if (response.success) {
    return { content: response.html, tabId: tab.id };
  }

  return response;
};

export const setElementValue = async (tabId, id, name, value) => {
  const response = await Browser.tabs.sendMessage(tabId, { action: "set_element_value", id, value, name });

  if (response.success) {
    return;
  }

  throw new Error("Error:", response.error);
};

export async function llmCall({
  prompt,
  system_prompt,
  temperature,
  json_output,
  stream,
  model,
}) {
  system_prompt = system_prompt === undefined ? 'You are a helpful assistant, tasked with helping users browse the web more effectively.' : system_prompt;
  temperature = temperature === undefined ? 1.0 : temperature;
  json_output = json_output === undefined ? false : json_output;
  stream = stream === undefined ? false : stream;
  model = model === undefined ? "gemini-1.5-flash" : model;

  const storage = await Browser.storage.local.get('api_key');

  const genAI = new GoogleGenerativeAI(storage.api_key);
  const safetySettings = [
    {
      "category": HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      "threshold": HarmBlockThreshold.BLOCK_NONE,
    },
    {
      "category": HarmCategory.HARM_CATEGORY_HARASSMENT,
      "threshold": HarmBlockThreshold.BLOCK_NONE,
    },
    {
      "category": HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      "threshold": HarmBlockThreshold.BLOCK_NONE,
    },
    {
      "category": HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      "threshold": HarmBlockThreshold.BLOCK_NONE,
    }
  ]

  const modelParams = {
    model,
    safetySettings,
    systemInstruction: system_prompt,
    generationConfig: {
      temperature: temperature,
      responseMimeType: json_output ? "application/json" : "text/plain",
    },
  }
  const gen_model = genAI.getGenerativeModel(modelParams)
  const chat = gen_model.startChat();

  if (json_output) {
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    try {
      const json = JSON.parse(response.text());
      return json;
    } catch (error) {
      console.error(error);
      console.error(response.text());
      return false;
    }
  }

  if (!stream) {
    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    return response.text();
  }

  const result = chat.sendMessageStream(prompt)
  return result
}


export function cleanHTML(document) {
  console.log(document);

  const elements = [...document.querySelectorAll('input, select, textarea')].filter(
    el => !el.outerHTML.includes('recaptcha') && !el.outerHTML.includes('hidden')
  );
  console.log(elements);

  return [...elements].map(el => {
    const relevantElement = document.createElement(el.tagName);

    if (el.id) relevantElement.setAttribute('id', el.id);
    if (el.name) relevantElement.setAttribute('name', el.name);
    const ariaAttributes = ['id', 'name', 'placeholder', 'aria-label', 'aria-placeholder', 'autocomplete', 'aria-autocomplete'];
    ariaAttributes.forEach(attr => {
      if (!el.hasAttribute(attr)) {
        return;
      }
      relevantElement.setAttribute(attr, el.getAttribute(attr));
    });

    if (el.textContent) relevantElement.textContent = el.textContent;

    const labelElements = [...document.querySelectorAll(`label[for="${el.id}"]`)].map(label => {
      const relevantLabel = document.createElement('label');
      relevantLabel.setAttribute('for', el.id);
      relevantLabel.textContent = label.textContent;
      return relevantLabel;
    });

    return [[...labelElements].map(el => el.outerHTML), el.parentElement.textContent, relevantElement.outerHTML].join('\n');
  }).join('\n\n');
}
