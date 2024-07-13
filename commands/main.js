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


const getExplainationFromGemeni = async (code) => {
  const prompt = "Please explain the code enclosed in <CODE> tag. <CODE>" + code + "</CODE>";
  const result = await gemini.generateContent(prompt);
  const response = result.response;
  return response.text();
}

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



const style = `
    <style>
    #outer-div {
      font-size: 1.5em;
      padding: 1em;
      word-wrap:break-word;
      width:80%;
    }
    </style>
  `;
const script = `
  <script>
    const dots = document.getElementById("dots");
    dots.style.fontSize = "45px";
    let dot = "";
    setInterval(() => {
      if (dot.length < 4){
        dot += ".";
      }else{
        dot = "";
      }
      dots.innerHTML = dot;
    }, 500);
  </script>

`;
const getCodeExplanation = async (code) => {
  if (!apiKey) {
    vscode.window.showErrorMessage(
      "Please set your Gemini API key in the extension settings."
    );
    return;
  }
  if (!code) {
    return "Please select the code you want to explain";
  }
  vscode.window.showInformationMessage(`Waiting for Your Explanation...`);
  let panel = vscode.window.createWebviewPanel(
    "waitcodeExplanation", // Id
    "Code Explanation", // Title
    vscode.ViewColumn.One, // Column
    {
      enableScripts: true,
    } // Options
  );

  panel.webview.html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Loading...</title>
        ${style}
    </head>
    <body>
      <div id="outer-div">Waiting for explanation <span id="dots"> </span> </div>
      ${script}
    </body>
  </html>
  `;

  panel.onDidDispose(() => {
    panel.dispose();
  });
  // Ask Gemini
  try {
    const explanation = await getExplainationFromGemeni(code);
    vscode.window.showInformationMessage("Explanation Ready!");
    panel.dispose();
    return explanation;
  } catch (err) {
    console.error(err);
    panel.dispose();
    return;
  }
};

const showCodeExplanation = (code) => {
  let panel = vscode.window.createWebviewPanel(
    "codeExplanation", // Id
    "Code Explanation", // Title
    vscode.ViewColumn.Beside, // Column
    {} // Options
  );
  code = md.render(code);
  panel.webview.html = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Code Explanation</title>
        ${style}
    </head>
    <body>
      <div id="outer-div">${code}</div>
    </body>
</html>

  `;

  panel.onDidDispose(() => {
    panel.dispose();
  });
};


module.exports = {
  getCodeExplanation,
  showCodeExplanation,
  genCode
};