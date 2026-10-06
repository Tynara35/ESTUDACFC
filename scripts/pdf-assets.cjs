const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../dist');
function files(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
fs.writeFileSync(path.join(root,'pdf-assets.js'),'self.PDF_ASSETS='+JSON.stringify(files('vendor/pdfjs'))+';\n');
