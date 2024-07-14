// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const path = require('path');
// Import the commands
const {
  getCodeExplanation,
  genCode,
  getExplainWebViewContent,
  genTestCode
} = require("./commands/main");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const errorMessage =
  "Something went wrong! Please make sure your API key is correct";
const failMessage = "Failed to get code Explanation!";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "gemini-code-companion" is now active!'
  );
 
  // create code generation
  let codeGenDisposable = vscode.commands.registerCommand('gemini-code-companion.gen-code', () => {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let selection = editor.selection;
        const document = editor.document;
        let fileName = editor.document.fileName;
        // let position = selection.end; // Get the end position of the selection
        const instruction = document.getText(selection);
        genCode(instruction, fileName, editor).then(success => {
            if (success) {
                vscode.window.showInformationMessage('Code inserted.');
            } else {
              vscode.window.showInformationMessage('Failed to generate code.');
            }
        }).catch(err => {
          vscode.window.showErrorMessage("Error in generating code:" + err);
      });
        // Insert text after the selection
        
    } else {
        vscode.window.showInformationMessage('No active editor found.');
    }
  });

  context.subscriptions.push(codeGenDisposable);
  // create a panel that show at the bottom of vs code ide

// Register a command that will show our panel
let explainPanelDisposable = vscode.commands.registerCommand('gemini-code-companion.explain', async function () {
  // Create and show a new webview panel
  const panel = vscode.window.createWebviewPanel(
    'gemini-code-companion.explain',
    'Explaination',
    vscode.ViewColumn.Two,
    {
      // Enable scripts in the webview
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  // Set the webview's content
  panel.webview.html = getExplainWebViewContent();
  const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("The editor is empty or not active");
        return;
      }
      // Get the code inside the editor
      const document = editor.document;
      const selection = editor.selection;
      const text = document.getText(selection);

      try {
        await getCodeExplanation(text, panel);
      } catch (err) {
        vscode.window.showErrorMessage(failMessage);
        console.error(err);
      }
  
});

context.subscriptions.push(explainPanelDisposable);


// register a command with name gemini-code-companion.gen-test.
// inside the function, the command will create a new file in the project folder

vscode.commands.registerCommand('gemini-code-companion.gen-test', async () => {

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    // get the file name from current editor with relative path to project folder
    let selection = editor.selection;
    const document = editor.document;
    const code = document.getText(selection);
    
    const currentFileName = editor.document.fileName;
    //console.log(currentFileName);
 
    const testFilePath = currentFileName.replace(/\.(.*)$/, '.test.$1'); 
    // prompt user to verify or change file path before proceeding in vs code extension

    const filePath = await vscode.window.showInputBox({
      placeHolder: `Test file path: ${testFilePath}`,
      prompt: 'Please verify or change the test file path to save:',
      value: testFilePath,
    });

    // If the user cancels, do nothing
    if (!filePath) {
      return;
    }

  try {
    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(''));
    await vscode.window.showTextDocument(vscode.Uri.file(filePath));
    await genTestCode(code, filePath, editor);
  } catch (error) {
    vscode.window.showErrorMessage(`Error creating file: ${error.message}`);
  }
    return editor.document.fileName;
  }
  
});


}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
