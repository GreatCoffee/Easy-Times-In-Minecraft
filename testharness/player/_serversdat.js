const fs=require('fs');
const p=process.argv[2];
const str=s=>{const x=Buffer.from(s,'utf8');const h=Buffer.alloc(2);h.writeUInt16BE(x.length);return Buffer.concat([h,x]);};
const parts=[
 Buffer.from([0x0a,0,0]),
 Buffer.from([0x09,0,0x07]), str('servers'), Buffer.from([0x0a,0,0,0,1]),
 Buffer.from([0x0a,0,0]),
 Buffer.from([0x08,0,4]), str('name'), str('ETIM test'),
 Buffer.from([0x08,0,2]), str('ip'), str('localhost:25565'),
 Buffer.from([0]),
 Buffer.from([0])
];
fs.writeFileSync(p,Buffer.concat(parts));
console.log('wrote',p,Buffer.concat(parts).length);