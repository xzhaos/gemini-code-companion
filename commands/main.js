const vscode = require("vscode");

// Markdown Format
const md = require("markdown-it")();

// Obtain the api key from the user
const config = vscode.workspace.getConfiguration("gemini-code-companion");
const apiKey = config.get("apiKey");
const modelId = config.get("model");
const isStreaming = config.get("streaming");

const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require("@google/generative-ai")

const genAI = new GoogleGenerativeAI(apiKey);
const gemini = genAI.getGenerativeModel(
  {
    model: modelId,
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
      },
    ],
  },
  { apiVersion: "v1beta" },
);



const genCode = async (instruction, fileName, editor) => {
  if (!apiKey) {
    vscode.window.showErrorMessage(
      "Please set your Gemini API key in the extension settings."
    );
    return;
  }
  // console.log(instruction);
  const prompt = "Please generate the code based on instructions enclosed in <INSTRUCTION> tag." + 
        "please detect the programming language based on file name: " + fileName + 
        "\nThe output should only have the generated code in plain text format. DO NOT INCLUDE BACKTICKS IN THE RESPONSE. <INSTRUCTION>" + instruction + "</INSTRUCTION>";
  
  let selection = editor.selection;
  let newPosition = selection.end;
  
  if (isStreaming) {
    const result = await gemini.generateContentStream([prompt]);
    await editor.edit(editBuilder => {
      editBuilder.insert(newPosition, "\n" );
    });
// print text as it comes in
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // console.log(chunkText);
      let selection = editor.selection;
      let newPosition = selection.end;
      await editor.edit(editBuilder => {
        editBuilder.insert(newPosition, chunkText );
      });
      
    //
    }

  } else {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const output = response.text();
    editor.edit(editBuilder => {
      editBuilder.insert(newPosition, '\n' + output );
    });

  }
  return true;
}


const getExplainWebViewContent= (() => {
  // Return the initial HTML content for the WebView
  return `
  <html>
  <head>
      <title>Code Explanation</title>
      <style>
       #content {
      font-size: 1.5em;
      padding: 1em;
      word-wrap:break-word;
      width:80%;
    }
      </style>
      <script>
          // Example of sending a message to the extension
          vscode.postMessage({ command: 'logMessage', text: 'Hello from WebView!' });
      </script>
  </head>
  <body>
      <div id="content"></div>
      <script>
          // Example of receiving a message from the extension
          window.addEventListener('message', event => {
              const message = event.data;
              if (message.command === 'updateContent') {
                  document.getElementById('content').innerHTML = message.text;
              }
          });
      </script>
  </body>
  </html>
  `;
});

const getCodeExplanation = async (code, panel) => {
  if (!apiKey) {
    vscode.window.showErrorMessage(
      "Please set your Gemini API key in the extension settings."
    );
    return;
  }
  if (!code) {
    return "Please select the code you want to explain";
  }
  
  const prompt = "Please explain the code enclosed in <CODE> tag. <CODE>" + code + "</CODE>";
  const result = await gemini.generateContentStream([prompt]);
  let text = "";
  for await (const chunk of result.stream) {
    text += chunk.text();
    panel.webview.postMessage({ command: 'updateContent', text: md.render(text) });
  // console.log(chunkText);
  }
  vscode.window.showInformationMessage(`Explanation completed`);
  
}


const genTestCode = async (code, filePath, editor) => {
  if (!apiKey) {
    vscode.window.showErrorMessage(
      "Please set your Gemini API key in the extension settings."
    );
    return;
  }
  // console.log(instruction);
  
  const prompt = "Please generate the test code based on code enclosed in <CODE> tag." + 
        "<CODE>" + code + "</CODE>"
  
  if (isStreaming) {
    const result = await gemini.generateContentStream([prompt]);
// print text as it comes in
    let text = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      // console.log(chunkText);
      // vscode append file with content x
      text += chunkText;
      await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(text));
    //
    }

  } else {
    const result = await gemini.generateContent(prompt);
    const response = result.response;
    const output = response.text();
    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(output));
  }
  return true;
}

module.exports = {
  getCodeExplanation,
  genCode,
  getExplainWebViewContent,
  genTestCode
};