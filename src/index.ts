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

