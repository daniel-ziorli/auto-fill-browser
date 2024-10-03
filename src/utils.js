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
  const tab = (await Browser.tabs.query({ active: true, currentWindow: true }))[0];
  const response = await Browser.tabs.sendMessage(tab.id, { action: 'get_html' });
  if (response.success) {
    return response.html;
  }

  return response;
};

export const setElementValue = async (id, name, value) => {
  const tab = await Browser.tabs.query({ active: true, currentWindow: true });
  const response = await Browser.tabs.sendMessage(tab[0].id, { action: "set_element_value", id, value, name });

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
  let output = ''
  const iterator = document.createNodeIterator(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node;
  let text_output = ''
  while ((node = iterator.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
      text_output += `${node.textContent.trim()}\n`
    } else if (node.tagName && ['INPUT', 'SELECT', 'TEXTAREA'].includes(node.tagName)) {
      if (node.type === 'file') {
        text_output = '';
        continue;
      }
      const relevantElement = document.createElement(node.tagName);
      if (node.id) relevantElement.setAttribute('id', node.id);
      if (node.name) relevantElement.setAttribute('name', node.name);
      const ariaAttributes = ['id', 'name', 'placeholder', 'aria-label', 'aria-placeholder'];
      ariaAttributes.forEach(attr => {
        if (!node.hasAttribute(attr)) {
          return;
        }
        relevantElement.setAttribute(attr, node.getAttribute(attr));
      });

      output += `${text_output}\n${relevantElement.outerHTML}\n\n`
      text_output = ''
    }
  }
  return output;
}
