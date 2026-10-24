const fs=require('fs'), zlib=require('zlib'), nbt=require('prismarine-nbt');
const buf=zlib.gunzipSync(fs.readFileSync(process.argv[2]));
nbt.parse(buf, (err,data)=>{
  if(err){console.error(err.message);process.exit(1);}
  const d=nbt.simplify(data).Data;
  const raw=data.value.Data.value;
  const r=raw.RandomSeed.value;
  const seed=((BigInt(r[0])<<32n)+BigInt.asUintN(32,BigInt(r[1]))).toString();
  console.log(JSON.stringify({SpawnX:d.SpawnX,SpawnY:d.SpawnY,SpawnZ:d.SpawnZ,LevelName:d.LevelName,Time:d.Time,DayTime:d.DayTime,RandomSeed:seed}));
});
