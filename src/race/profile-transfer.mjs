const encoder=new TextEncoder(),decoder=new TextDecoder(),magic=new Uint8Array([84,85,75,78,71,79,0,1]);
async function key(password,salt){
 if(typeof password!=='string'||password.length<8||password.length>256)throw Error('profile-password');
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
function validate(value){if(!value||!/^[a-f0-9-]{36}$/.test(value.id)||typeof value.token!=='string'||value.token.length>512||value.token.split('.').length!==2)throw Error('profile-file');try{const claim=JSON.parse(atob(value.token.split('.')[0].replaceAll('-','+').replaceAll('_','/')));if(claim.id!==value.id)throw Error();}catch{throw Error('profile-file');}return {id:value.id,token:value.token,name:typeof value.name==='string'?value.name.slice(0,24):''};}
export async function sealGuestProfile(profile,password){
 const value=validate(profile),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:magic},await key(password,salt),encoder.encode(JSON.stringify(value))));
 const file=new Uint8Array(36+ciphertext.length);file.set(magic);file.set(salt,8);file.set(iv,24);file.set(ciphertext,36);return file;
}
export async function openGuestProfile(bytes,password){
 if(!(bytes instanceof Uint8Array)||bytes.length<52||bytes.length>4096||!magic.every((v,i)=>bytes[i]===v))throw Error('profile-file');
 try{const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(24,36),additionalData:magic},await key(password,bytes.slice(8,24)),bytes.slice(36));return validate(JSON.parse(decoder.decode(data)));}
 catch(error){if(error.message==='profile-password')throw error;throw Error('profile-file');}
}
