import{j as s}from"./query-qZtD6GUv.js";import{c as n,a as r}from"./index-BS8m2mTE.js";import{u as l,e as m}from"./vendor-BB0vd7KJ.js";import{H as p,U as i}from"./user-PmsS_Pz3.js";import{H as h}from"./heart-B7CfIyFA.js";import{S as u}from"./sparkles-CYKdN9_M.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=n("Compass",[["path",{d:"m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z",key:"9ktpf1"}],["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}]]),b=[{path:"/",icon:p,label:"Home"},{path:"/heatmap",icon:x,label:"Heat"},{path:"/matches",icon:h,label:"Matches"},{path:"/quests",icon:u,label:"Quests"},{path:"/profile",icon:i,label:"Profile"}],k=()=>{const t=l(),o=m();return s.jsx("nav",{className:"bottom-nav",children:b.map(a=>{const e=o.pathname===a.path,c=a.icon;return s.jsxs("button",{onClick:()=>t(a.path),className:r("bottom-nav-item",e&&"active"),children:[s.jsx(c,{className:"w-6 h-6"}),s.jsx("span",{className:"text-xs",children:a.label})]},a.path)})})};export{k as B};
