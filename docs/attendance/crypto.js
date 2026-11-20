(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('node:crypto').webcrypto);else root.BonitoAttendanceCrypto=factory(root.crypto);})(typeof globalThis!=='undefined'?globalThis:this,function(web){
 'use strict';const ITERATIONS=600000,context=new TextEncoder().encode('bonito-attendance:v1');
 function base64(bytes){if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
 function bytes(value){if(typeof value!=='string'||value.length>12000000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw Error('암호화 파일 형식이 다릅니다.');if(typeof Buffer!=='undefined')return new Uint8Array(Buffer.from(value,'base64'));return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
 async function derive(password,salt){if(!web?.subtle)throw Error('HTTPS 웹주소와 최신 브라우저를 사용해 주세요.');if(typeof password!=='string'||password.length>1024)throw Error('조회 비밀번호를 확인해 주세요.');const material=await web.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return web.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 async function seal(value,password){
  if(typeof password!=='string'||password.length<12||password.length>1024)throw Error('조회 비밀번호는 12자 이상으로 설정해 주세요.');
  const salt=web.getRandomValues(new Uint8Array(16)),iv=web.getRandomValues(new Uint8Array(12)),key=await derive(password,salt);
  const encrypted=await web.subtle.encrypt({name:'AES-GCM',iv,additionalData:context,tagLength:128},key,new TextEncoder().encode(JSON.stringify(value)));
  return {format:'bonito-attendance-encrypted',version:1,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,cipher:'AES-256-GCM',salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))};
 }
 async function unlock(value,password){
  if(!value||value.format!=='bonito-attendance-encrypted'||value.version!==1||value.kdf!=='PBKDF2-SHA256'||value.iterations!==ITERATIONS||value.cipher!=='AES-256-GCM')throw Error('지원하지 않는 암호화 파일입니다.');
  const salt=bytes(value.salt),iv=bytes(value.iv),ciphertext=bytes(value.ciphertext);if(salt.length!==16||iv.length!==12||ciphertext.length<16)throw Error('암호화 파일 형식이 다릅니다.');
  try{const key=await derive(password,salt);const plain=await web.subtle.decrypt({name:'AES-GCM',iv,additionalData:context,tagLength:128},key,ciphertext);return JSON.parse(new TextDecoder().decode(plain));}catch{throw Error('비밀번호가 다르거나 파일이 손상되었습니다.');}
 }
 return {seal,unlock,ITERATIONS};
});
