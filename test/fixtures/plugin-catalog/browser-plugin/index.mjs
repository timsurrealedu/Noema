let input="";
for await(const chunk of process.stdin)input+=chunk;
const payload=JSON.parse(input);
process.stdout.write(JSON.stringify({taskCount:payload.context.tasks.length,notifications:[{title:"Browser plugin completed",body:"Verified isolated execution"}]}));
