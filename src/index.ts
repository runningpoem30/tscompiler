// THE TOKENIZER
// in this we will take our string of code and break it down into an array of token
// defining the type of a token for typesafety
type TokenType = 'paren' | 'name' | 'number' | 'string';

interface Token {
    type : TokenType , 
    value : string
}

function tokenizer(input : string) : Token[]{
   //this is basically a variable which tracks the position in the lines of code we are writing ; acts like a cursor 
   let current = 0; 

   let tokens: Token[] = [];


   while(current < input.length){
    let char = input[current];

// checking for open parenthesis
    if(char === '('){
        tokens.push({
            type : 'paren' ,
            value : '('
        })

        current ++ ;
        continue;
    }

//checking for closed parenthesis
    if (char === ')') {
      tokens.push({
        type: 'paren',
        value: ')',
      });
      current++;
      continue;
    }


//cheking for typesafety
    let WHITESPACE = /\s/;
    //chcking if the char is not UNDEFINED before testing it for whitespace
    if (char && WHITESPACE.test(char)) {
      current++;
      continue;
    }


//checking for numbers
//tokens can be a numnber and it can be a sequence of character and we have to treat that one sequence as one token .. for example 123 will be treated as one token 2 will be treated as one token and 3232 will be treated as one token 

//first define what a number is  
    let NUMBERS =  /[0-9]/;
    if(char && NUMBERS.test(char)){

        //push the numbers to this 
        let value ='';


        while( char && NUMBERS.test(char)){
            value += char;

            current++;

            char = input[current];
        }

        tokens.push({type : 'number' , value})
        continue;
    }

//checking for strings
if (char === '"') {
    let value = '';

    // 1. Skip the opening quote
    current++;
    char = input[current];

    // 2. Iterate until we hit the closing quote OR the end of the file
    // Adding 'char !== undefined' prevents an infinite loop on unclosed strings
    while (char !== undefined && char !== '"') {
        value += char;
        current++;
        char = input[current];
    }

    // 3. Error handling for unclosed strings
    if (char === undefined) {
        throw new TypeError("Unterminated string: Expected a closing double quote.");
    }

    // 4. Skip the closing quote
    current++;
    
    // Note: No need to update 'char' here because the main loop 
    // does 'char = input[current]' right after the 'continue'

    tokens.push({ type: 'string', value });
    continue;
}


//checking for names ---> like add subtract 
    let LETTERS = /[a-z]/;
    if(char && LETTERS.test(char)){
        let value = '';


        while(char && LETTERS.test(char))
        {
            value += char,
            current ++ ;
            char = input[current]
        }

        tokens.push({type : 'name' , value})
        continue;
    }


     throw new TypeError('I dont know what this character is :' + char)
   }
   return tokens;
}



/// THE PARSER
// the parser takes the array of tokens and converts it into an AST (ABSTRACT SYNTAX TREE)


type ASTNode = NumberLiteral | StringLiteral | CallExpression;

interface NumberLiteral{
    type : 'NumberLiteral';
    value : string;
}

interface StringLiteral{
    type : 'StringLiteral';
    value : string;
}


interface CallExpression{
    type : 'CallExpression',

}

interface CallExpression {
  type: 'CallExpression';
  name: string;
  params: ASTNode[];
}

interface RootNode {
  type: 'Program';
  body: ASTNode[];
}


function parser(tokens : Token[]) : RootNode{
    
    let current = 0; 
    function walk() : ASTNode{

        let token = tokens[current];

        if(token?.type === 'number'){
            current++;

            return {
                type: 'NumberLiteral',
                value: token.value,
            };
        }

        if (token?.type === 'string') {
        current++;

        return {
            type: 'StringLiteral',
            value: token.value,
        };
        }


        //checking for callexpressions 
        // when we encounter an open pranthesis

        if(
            token?.type === 'paren' && 
            token.value === '('
        ){
            // skip the parenthesis because we dont care about parenthesis in the AST
            current++;

            let node : CallExpression = {
                type : 'CallExpression',
                name : token.value,
                params : []
            }

            current ++;
            token = tokens[current];



              while (
        (token?.type !== 'paren') ||
        (token.type === 'paren' && token.value !== ')')
      ) {
        // we'll call the `walk` function which will return a `node` and we'll
        // push it into our `node.params`.
        node.params.push(walk());
        token = tokens[current];
      }

      current++;
      return node;
        }




  throw new TypeError(token?.type)
    }

    let ast :RootNode = {
    type: 'Program',
    body: [],
  };
     
  while (current < tokens.length) {
    ast.body.push(walk());
  }


    return ast;
}



//TRAVERSER
// this accepts an AST and a visitor  
// A generic type for a visitor method (enter/exit)
type VisitorMethod<T> = (node: T, parent: ASTNode | RootNode | null) => void;

// The structure of the visitor object
interface Visitor {
  Program?: {
    enter?: VisitorMethod<RootNode>;
    exit?: VisitorMethod<RootNode>;
  };
  CallExpression?: {
    enter?: VisitorMethod<CallExpression>;
    exit?: VisitorMethod<CallExpression>;
  };
  NumberLiteral?: {
    enter?: VisitorMethod<NumberLiteral>;
    exit?: VisitorMethod<NumberLiteral>;
  };
  StringLiteral?: {
    enter?: VisitorMethod<StringLiteral>;
    exit?: VisitorMethod<StringLiteral>;
  };
}

function traverser(ast: RootNode, visitor: Visitor) {

  // array is typed as ASTNode[] because Program.body and CallExpression.params use it
  function traverseArray(array: ASTNode[], parent: ASTNode | RootNode) {
    array.forEach(child => {
      traverseNode(child, parent);
    });
  }

  function traverseNode(node: ASTNode | RootNode, parent: ASTNode | RootNode | null) {
    // We use 'any' here briefly because indexing the visitor with a dynamic string 
    // is tricky for TS, but the specific methods are still safely typed above.
    const methods = (visitor as any)[node.type];

    // 1. Enter
    if (methods && methods.enter) {
      methods.enter(node, parent);
    }

    // 2. Action based on type
    switch (node.type) {
      case 'Program':
        // TypeScript now knows 'node' is a RootNode, so 'node.body' exists
        traverseArray(node.body, node);
        break;

      case 'CallExpression':
        // TypeScript knows 'node' is a CallExpression, so 'node.params' exists
        traverseArray(node.params, node);
        break;

      case 'NumberLiteral':
      case 'StringLiteral':
        // Leaf nodes: nothing to do
        break;

      default:
        throw new TypeError((node as any).type);
    }

    // 3. Exit
    if (methods && methods.exit) {
      methods.exit(node, parent);
    }
  }

  // Start the engine
  traverseNode(ast, null);
}




//TRANSFORMER
// Add the _context property to your existing types
interface NumberLiteral {
  type: 'NumberLiteral';
  value: string;
  _context?: any[]; // The 'any' is the new AST nodes
}

interface StringLiteral {
  type: 'StringLiteral';
  value: string;
  _context?: any[];
}

interface CallExpression {
  type: 'CallExpression';
  name: string;
  params: ASTNode[];
  _context?: any[];
}

interface RootNode {
  type: 'Program';
  body: ASTNode[];
  _context?: any[];
}


function transformer(ast: RootNode) {
  // 1. Create the base of our new AST (the JavaScript-style tree)
  const newAst: any = {
    type: 'Program',
    body: [],
  };


  (ast as any)._context = newAst.body;

  // 3. Start traversing the old AST with our "Visitor"
  traverser(ast, {
    
    // Transform Numbers: (123) -> 123
    NumberLiteral: {
      enter(node, parent) {
        if (parent && (parent as any)._context) {
          (parent as any)._context.push({
            type: 'NumberLiteral',
            value: node.value,
          });
        }
      },
    },

    // Transform Strings: ("hello") -> "hello"
    StringLiteral: {
      enter(node, parent) {
        if (parent && (parent as any)._context) {
          (parent as any)._context.push({
            type: 'StringLiteral',
            value: node.value,
          });
        }
      },
    },

    // Transform Call Expressions: (add 2 3) -> add(2, 3)
    CallExpression: {
      enter(node, parent) {
        // Create the JS-style CallExpression structure
        let expression: any = {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name: node.name,
          },
          arguments: [],
        };

        // We set a new context for this node's CHILDREN.
        // Any child of this CallExpression will now push into 'arguments'.
        (node as any)._context = expression.arguments;

        // In JavaScript, a top-level function call is usually 
        // wrapped in an "ExpressionStatement" so it ends with a semicolon.
        if (parent && parent.type !== 'CallExpression') {
          expression = {
            type: 'ExpressionStatement',
            expression: expression,
          };
        }

        // Push this new expression to the parent's context
        if (parent && (parent as any)._context) {
          (parent as any)._context.push(expression);
        }
      },
    },
  });

  // 4. Return the brand new, shiny JavaScript-style AST
  return newAst;
}


// THE CODEGENERATOR

function codeGenerator(node: any): string {
  // We break things down by the `type` of the node.
  switch (node.type) {

    // If we have a `Program` node, we will map through each node in the `body`
    // and run them through the code generator and join them with a newline.
    case 'Program':
      return node.body.map(codeGenerator).join('\n');

    // For `ExpressionStatement` we'll run the nested expression through the
    // code generator and add a semicolon at the end.
    case 'ExpressionStatement':
      return (
        codeGenerator(node.expression) + ';'
      );

 
    case 'CallExpression':
      return (
        codeGenerator(node.callee) +
        '(' +
        node.arguments.map(codeGenerator).join(', ') +
        ')'
      );

    // For `Identifier` we'll just return the node's name.
    case 'Identifier':
      return node.name;

    // For `NumberLiteral` we'll just return the node's value.
    case 'NumberLiteral':
      return node.value;

    // For `StringLiteral` we'll add quotations around the node's value.
    case 'StringLiteral':
      return '"' + node.value + '"';

    // And if we haven't recognized the node, we'll throw an error.
    default:
      throw new TypeError(node.type);
  }
}



///THE FINAL COMPILER

function compiler(input: string): string {
  const tokens = tokenizer(input);
  const ast    = parser(tokens);
  const newAst = transformer(ast);
  const output = codeGenerator(newAst);

  return output;
}

// TEST IT!
const lispCode = '(add 2 (subtract 4 2))';
const jsCode   = compiler(lispCode);

console.log('--- LISP INPUT ---');
console.log(lispCode);

console.log('\n--- JS OUTPUT ---');
console.log(jsCode); 
// Output: add(2, subtract(4, 2));