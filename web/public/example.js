import { generateForm } from "./form.js";
for (const example of document.getElementsByClassName("example")) {
  const dataset = { ...example.dataset };
  for (const datapoint in dataset)
    dataset[datapoint] = dataset[datapoint].split(",");
  generateForm(example, dataset);
  for (const input of example.querySelectorAll("input"))
    input.toggleAttribute("readonly", true);
  for (const button of example.querySelectorAll("button"))
    button.toggleAttribute("disabled", true);
}
