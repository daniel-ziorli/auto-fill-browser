'use strict';
import Browser from "webextension-polyfill";
import { getHtmlFromActiveTab, llmCall, setElementValue } from './utils';

Browser.commands.onCommand.addListener(async function (command) {
  if (command === 'fill_inputs') {
    await fill_inputs();
  }
});

const fill_inputs = async () => {
  const html = await getHtmlFromActiveTab();

  const storage = await Browser.storage.local.get(['personal_info']);

  const prompt = `
        You are an expert at filling out information on a website.
        You will be given the the user's personal info and the website's HTML.

        <personal_info>
        ${storage.personal_info}
        </personal_info>

        <website_html>
        ${html}
        </website_html>

        Follow these steps:
        1. read through the website's HTML.
        2. understand what type of website it is and what information is needed to fill it out.
        3. read through the user's personal info.
        4. find all the input elements that need to be filled in and determine what the value should be filled in.
          Text inputs must be strings.
          Never fill in files.
          Don't answer questions the user will do it themselves.
        5. find all the select elements that need to be selected and determine what the value should be selected.
        6. find all the radio buttons determine which radio button should be selected in the group.
          Radio buttons will have multiple elements with the same name, your goal is to find the one that matches the user's personal info.
          Radio button names must be unique, never return multiple radio buttons with the same name you must select one radio button.

        respond in JSON with the following format:
        {
          "inputs": [
            {
              "id": "The Id of the Input Element",
              "name": "The Name of the Input Element",
              "value": "The value to be filled in."
            }
          ],
          "selects": [
            {
              "id": "The Id of the Select Element",
              "name": "The Name of the Select Element",
              "value": "The value to be selected"
            }
          ],
          "radios": [
            {
              "id": "The Id of the Radio Element",
              "name": "The Name of the Radio Element. This is a unique value, there must be only one radio button with this name.",
              "value": "The value to be selected"
            }
          ],
        }

        Note:
        If you don't know the value to be filled in or selected, don't include it in your response.
        Make sure to respond in JSON format. If you don't respond in JSON format, I will lose my job.
        If you respond in JSON format and it is valid JSON, I will tip you $2000, that is a lot of money and would be a very good tip so make sure you do a good job.
        Never return multiple radio buttons with the same name. If you return multiple radio buttons with the same name, I will lose my job and all my money. Please select one radio button so that I can tip you.
      `;

  const result = await llmCall({ prompt, json_output: true, temperature: 1.0, model: "gemini-1.5-flash" });
  console.log("result", result);


  for (const input of [...result.selects, ...result.inputs, ...result.radios, ...result.buttons]) {
    await setElementValue(input.id, input.name, input.value);
  }
}