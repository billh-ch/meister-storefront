import { PRODUCTS, FIN_PRODUCTS } from './reference'
import type { Answers, SuitModel, FinModel } from './types'

/* Deterministic, explainable rules. No fit or thermal certification is inferred. */
export function thermalPlan(a: Answers): {range: number[] | null; adjusted: boolean}{
 if(a.temp==='unknown'||a.temp==='cold')return {range:null,adjusted:false};
 const tiers=[[3,3.5],[5,5.5],[7,7.5],[8,9]];
 let tier=({warm:0,mild:1,cool:2} as Record<string,number>)[a.temp];
 if(tier===undefined)return {range:null,adjusted:false};
 const adjusted=a.duration==='long'||a.cold==='yes';
 if(adjusted)tier=Math.min(tier+1,3);
 return {range:tiers[tier],adjusted};
}
export function rankSuits<T extends SuitModel = SuitModel>(a: Answers,products: T[] = PRODUCTS as T[]){
 const plan=thermalPlan(a);
 if(a.temp==='cold')return {plan,matches:[]};
 const cap=a.budget==='any'?Infinity:Number(a.budget);
 const matches=products.filter(p=>{
   if(!p.uses.includes(a.use)||p.price[0]>cap)return false;
   if(a.care==='easy'&&p.inner!=='lined')return false;
   if(a.care==='rugged'&&p.outer!=='lined')return false;
   if(a.care==='smooth'&&p.outer!=='smooth')return false;
   if(plan.range&&!p.thickness.some(t=>t>=plan.range[0]&&t<=plan.range[1]))return false;
   return true;
 }).map(p=>{
   let score=0;
   if(a.use==='pool'&&p.id==='sheico')score+=20;
   if(a.use==='spear'&&p.id==='camo')score+=9;
   if(a.use==='free'&&p.id==='daiwabo')score+=7;
   if(a.care==='smooth'&&p.outer==='smooth')score+=12;
   if(a.care==='smooth'&&p.outer==='lined')score-=10;
   if(a.care==='rugged'&&p.id==='camo')score+=7;
   if(a.care==='unsure'&&p.outer==='lined')score+=6;
   if(a.care==='unsure'&&p.inner==='lined')score+=3;
   if(a.care==='easy'&&p.inner==='lined')score+=10;
   if((a.temp==='cool'||a.cold==='yes')&&['pro','scs'].includes(p.id))score+=9;
   if(p.id==='pro')score+=1;
   const options=plan.range?p.thickness.filter(t=>t>=plan.range[0]&&t<=plan.range[1]):[];
   return {product:p,score,thickness:options.length?options[0]:null};
 }).sort((x,y)=>y.score-x.score||x.product.price[0]-y.product.price[0]||x.product.id.localeCompare(y.product.id));
 return {plan,matches};
}

/* Model ranking is editorial, informed by Meister's descriptions. No depth or fit guarantee. */
export function finStiffness(a: Answers){
 if(a.experience==='new'||a.power==='light')return 'S–MS';
 if(a.power==='strong')return 'M–MH';
 return 'MS–M';
}
export function rankFins<T extends FinModel = FinModel>(a: Answers,products: T[] = FIN_PRODUCTS as T[]){
 const cap=a.budget==='any'?Infinity:Number(a.budget);
 return products.filter(p=>p.stock!=='out'&&p.price[0]<=cap).map(p=>{
   const f=p.family,is30=f==='f1-30';let score=0;
   const reasons: string[]=[];
   const add=(n: number,key?: string | null)=>{score+=n;if(key)reasons.push(key);};
   if(a.use==='mixed'){if(f==='evo')add(8,'mixed');else if(f==='x')add(1);}
   if(a.use==='depth'){if(f==='f1')add(5,'depth');else if(is30)add(3,'depth');else if(f==='evo')add(1);}
   if(a.use==='weighted'){if(is30)add(10,'spear');else if(f==='f1')add(2,'depth');else if(f==='evo')add(1);}
   if(a.use==='easy'){if(f==='x')add(8,'relaxed');else if(f==='evo'||f==='plastic')add(1);}
   if(a.use==='pool'&&(f==='evo'||f==='x'))add(3,'pool');
   if(a.depth==='shallow'){if(f==='evo')add(3);else if(f==='x')add(2);else if(f==='plastic')add(1);}
   if(a.depth==='mid'&&(f==='evo'||f==='f1'||is30))add(2);
   if(a.depth==='deep'){if(f==='f1')add(4,'depth');else if(is30)add(5,'depth');else if(f==='evo')add(1);}
   if(a.experience==='new'&&(f==='x'||f==='evo'))add(1);
   if(a.experience==='advanced'&&(f==='f1'||is30))add(1);
   if(a.power==='light'){if(f==='x')add(4,'relaxed');else if(f==='evo')add(2);else if(f==='f1'||is30)add(-1);}
   if(a.power==='average'){if(f==='evo')add(2);else if(f==='x'||f==='f1'||is30)add(1);}
   if(a.power==='strong'){if(f==='f1'||is30)add(3,'drive');else if(f==='evo')add(1);}
   if(a.travel==='standard')add(p.long?-2:3,p.long?null:'standard');
   if(a.travel==='long'&&p.long)add(4,'long');
   if(f==='plastic'&&cap<=150)add(12,'budget');
   // Same-family standard version wins a tie; a Long preference can change this.
   return {product:p,score,reasons:[...new Set(reasons)]};
 }).sort((x,y)=>y.score-x.score||x.product.price[0]-y.product.price[0]||Number(x.product.long)-Number(y.product.long)||x.product.id.localeCompare(y.product.id));
}
