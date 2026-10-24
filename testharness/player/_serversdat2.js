const fs=require('fs'), nbt=require('prismarine-nbt');
const b=[];
const raw=s=>{const x=Buffer.from(s,'utf8');return [x.length>>8&255,x.length&255,...x];};
b.push(0x0a,0,0);                       // root compound, empty name
b.push(0x09,...raw('servers'),0x0a,0,0,0,1); // TAG_List<Compound>, 1 entry
b.push(0x0a,0,0);                       // entry compound
b.push(0x08,...raw('name'),...raw('ETIM test'));
b.push(0x08,...raw('ip'),...raw('localhost:25565'));
b.push(0);                              // end entry
b.push(0);                              // end root
const buf=Buffer.from(b);
nbt.parse(buf,(e,d)=>{
  if(e){console.error('PARSE FAIL: '+e.message);process.exit(1);}
  console.log('PARSE OK: '+JSON.stringify(nbt.simplify(d)));
  fs.writeFileSync(process.argv[2],buf);
  console.log('written '+buf.length+'B to '+process.argv[2]);
});