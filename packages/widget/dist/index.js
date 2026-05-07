import"./chunk-YVLJX3HV.js";var R,Fe,nt;function ot(n,e){if(nt=new Date,n.nodeType!==Node.ELEMENT_NODE)throw new Error("Can't generate CSS selector for non-element node type.");if(n.tagName.toLowerCase()==="html")return"html";let t={root:document.body,idName:o=>!0,className:o=>!0,tagName:o=>!0,attr:(o,i)=>!1,seedMinLength:1,optimizedMinLength:2,threshold:1e3,maxNumberOfTries:1e4,timeoutMs:void 0};R={...t,...e},Fe=bs(R.root,t);let s=G(n,"all",()=>G(n,"two",()=>G(n,"one",()=>G(n,"none"))));if(s){let o=at(lt(s,n));return o.length>0&&(s=o[0]),J(s)}else throw new Error("Selector was not found.")}function bs(n,e){return n.nodeType===Node.DOCUMENT_NODE?n:n===e.root?n.ownerDocument:n}function G(n,e,t){let s=null,o=[],i=n,r=0;for(;i;){let a=new Date().getTime()-nt.getTime();if(R.timeoutMs!==void 0&&a>R.timeoutMs)throw new Error(`Timeout: Can't find a unique selector after ${a}ms`);let l=Q(gs(i))||Q(...ms(i))||Q(...fs(i))||Q(vs(i))||[st()],c=ys(i);if(e=="all")c&&(l=l.concat(l.filter(Me).map(d=>V(d,c))));else if(e=="two")l=l.slice(0,1),c&&(l=l.concat(l.filter(Me).map(d=>V(d,c))));else if(e=="one"){let[d]=l=l.slice(0,1);c&&Me(d)&&(l=[V(d,c)])}else e=="none"&&(l=[st()],c&&(l=[V(l[0],c)]));for(let d of l)d.level=r;if(o.push(l),o.length>=R.seedMinLength&&(s=et(o,t),s))break;i=i.parentElement,r++}return s||(s=et(o,t)),!s&&t?t():s}function et(n,e){let t=at(rt(n));if(t.length>R.threshold)return e?e():null;for(let s of t)if(it(s))return s;return null}function J(n){let e=n[0],t=e.name;for(let s=1;s<n.length;s++){let o=n[s].level||0;e.level===o-1?t=`${n[s].name} > ${t}`:t=`${n[s].name} ${t}`,e=n[s]}return t}function tt(n){return n.map(e=>e.penalty).reduce((e,t)=>e+t,0)}function it(n){let e=J(n);switch(Fe.querySelectorAll(e).length){case 0:throw new Error(`Can't select any node with this selector: ${e}`);case 1:return!0;default:return!1}}function gs(n){let e=n.getAttribute("id");return e&&R.idName(e)?{name:"#"+CSS.escape(e),penalty:0}:null}function ms(n){return Array.from(n.attributes).filter(t=>R.attr(t.name,t.value)).map(t=>({name:`[${CSS.escape(t.name)}="${CSS.escape(t.value)}"]`,penalty:.5}))}function fs(n){return Array.from(n.classList).filter(R.className).map(t=>({name:"."+CSS.escape(t),penalty:1}))}function vs(n){let e=n.tagName.toLowerCase();return R.tagName(e)?{name:e,penalty:2}:null}function st(){return{name:"*",penalty:3}}function ys(n){let e=n.parentNode;if(!e)return null;let t=e.firstChild;if(!t)return null;let s=0;for(;t&&(t.nodeType===Node.ELEMENT_NODE&&s++,t!==n);)t=t.nextSibling;return s}function V(n,e){return{name:n.name+`:nth-child(${e})`,penalty:n.penalty+1}}function Me(n){return n.name!=="html"&&!n.name.startsWith("#")}function Q(...n){let e=n.filter(xs);return e.length>0?e:null}function xs(n){return n!=null}function*rt(n,e=[]){if(n.length>0)for(let t of n[0])yield*rt(n.slice(1,n.length),e.concat(t));else yield e}function at(n){return[...n].sort((e,t)=>tt(e)-tt(t))}function*lt(n,e,t={counter:0,visited:new Map}){if(n.length>2&&n.length>R.optimizedMinLength)for(let s=1;s<n.length-1;s++){if(t.counter>R.maxNumberOfTries)return;t.counter+=1;let o=[...n];o.splice(s,1);let i=J(o);if(t.visited.has(i))return;it(o)&&ks(o,e)&&(yield o,t.visited.set(i,!0),yield*lt(o,e,t))}}function ks(n,e){return Fe.querySelector(J(n))===e}var ws=["role","aria-label","type","name","href","src","data-testid","data-id"];function Cs(n){let e=5381;for(let t=0;t<n.length;t++)e=(e<<5)+e+n.charCodeAt(t)|0;return(e>>>0).toString(36)}function Be(n){let e=n.children.length,t=0,s=n.parentElement;if(s)for(let r of s.children){if(r===n)break;r.tagName===n.tagName&&t++}let o=[];for(let r of ws){let a=n.getAttribute(r);a&&o.push(`${r}=${a}`)}let i=o.length>0?Cs(o.join(",")):"0";return`${e}:${t}:${i}`}function pt(n,e){let t=e.split(":");if(t.length!==3)return 0;let[s,o,i]=t,r=Number(s),a=Number(o);if(Number.isNaN(r)||Number.isNaN(a))return 0;let l=Be(n),[c,d,u]=l.split(":"),b=0,f=Math.abs(Number(c)-r);f===0?b+=.2:f<=2?b+=.1:f<=5&&(b+=.03);let x=Math.abs(Number(d)-a);return x===0?b+=.4:x===1?b+=.2:x<=3&&(b+=.08),u===i&&(b+=.4),b}function _(n,e){let t=e==="before"?"previousElementSibling":"nextElementSibling",s=n[t],o=3;for(;s&&o>0;){let i=s.textContent?.trim();if(i)return e==="before"?i.slice(-32):i.slice(0,32);s=s[t],o--}return""}function Z(n){let e=n.previousElementSibling?.textContent?.trim().slice(0,40)??"",t=n.nextElementSibling?.textContent?.trim().slice(0,40)??"";return[e,t].filter(Boolean).join(" | ")}function ct(n){if(n.id){let s=n.id.includes("'")?`concat('${n.id.replace(/'/g,`',"'",'`)}')`:`'${n.id}'`;return`//${n.localName}[@id=${s}]`}let e=[],t=n;for(;t&&t!==document.body&&e.length<6;){let s=t.localName,o=t.parentElement;if(t.id){let r=t.id.includes("'")?`concat('${t.id.replace(/'/g,`',"'",'`)}')`:`'${t.id}'`;return e.unshift(`/${s}[@id=${r}]`),"/"+e.join("")}let i=1;if(o)for(let r of o.children){if(r===t)break;r.localName===s&&i++}e.unshift(`/${s}[${i}]`),t=o}return"/html/body"+e.join("")}var j="data-feedback-anchor";function Re(n){let e=ot(n,{className:u=>!/^(css|sc|emotion|styled)-/.test(u)&&!/^[a-z]{1,3}[A-Za-z0-9]{4,8}$/.test(u),attr:u=>["data-testid","data-id","role","aria-label"].includes(u),idName:u=>!u.startsWith("radix-")&&!/^:r[0-9]+:$/.test(u),seedMinLength:3,optimizedMinLength:2}),t=ct(n),o=(n.textContent?.trim()??"").slice(0,120),i=_(n,"before"),r=_(n,"after"),a=Be(n),l=Z(n),d=n.closest(`[${j}]`)?.getAttribute(j)??null;return{cssSelector:e,xpath:t,textSnippet:o,textPrefix:i,textSuffix:r,fingerprint:a,neighborText:l,elementTag:n.tagName,elementId:n.id||void 0,anchorKey:d}}function dt(n,e){let t=n.getBoundingClientRect();return t.left<=e.x&&t.top<=e.y&&t.right>=e.x+e.width&&t.bottom>=e.y+e.height}function ut(n,e=document.documentElement){let t=n.x+n.width/2,s=n.y+n.height/2,o=document.elementFromPoint(t,s);if(!o||o===e)return document.body;let i=o;for(;i&&i!==document.body;){if(i.hasAttribute(j)&&dt(i,n))return i;i=i.parentElement}for(i=o;i&&i!==document.body;){if(dt(i,n))return i;i=i.parentElement}return document.body}function ht(n,e){return e.width<=0||e.height<=0?{xPct:0,yPct:0,wPct:1,hPct:1}:{xPct:(n.x-e.x)/e.width,yPct:(n.y-e.y)/e.height,wPct:n.width/e.width,hPct:n.height/e.height}}function y(n){let s=document.createRange().createContextualFragment(n).firstElementChild;if(!s||s.nodeName.toLowerCase()!=="svg")throw new Error("[siteping] Invalid SVG string");for(let o of[...s.attributes])o.name.startsWith("on")&&s.removeAttribute(o.name);for(let o of s.querySelectorAll("*"))for(let i of[...o.attributes])i.name.startsWith("on")&&o.removeAttribute(i.name);return s}function p(n,e){let t=document.createElement(n);if(e)for(let[s,o]of Object.entries(e))s==="class"?t.className=o:s==="style"?t.style.cssText=o:t.setAttribute(s,o);return t}function h(n,e){n.textContent=e}function ee(n,e="en"){let t=Date.now()-new Date(n).getTime(),s=Math.floor(t/1e3);if(s<60)return new Intl.RelativeTimeFormat(e,{numeric:"auto"}).format(0,"second");let o=new Intl.RelativeTimeFormat(e,{numeric:"always",style:"narrow"}),i=Math.floor(s/60);if(i<60)return o.format(-i,"minute");let r=Math.floor(i/60);if(r<24)return o.format(-r,"hour");let a=Math.floor(r/24);return a<7?o.format(-a,"day"):new Date(n).toLocaleDateString(e)}var Pe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',bt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',gt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>',Ie='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',De='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',te='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',mt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',se='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',ne='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',oe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',ie='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="6" width="8" height="14" rx="4"/><path d="M19 9h2"/><path d="M3 9h2"/><path d="M19 13h2"/><path d="M3 13h2"/><path d="M19 17h2"/><path d="M3 17h2"/><path d="M10 2h4"/></svg>',re='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',Oe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',ft='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></svg>',vt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',yt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',Ne='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';var kt="#0066ff",Es=/^#[0-9a-fA-F]{6}$/,xt=/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/,Ss=/^#[0-9a-fA-F]{8}$/;function Ts(n){if(Es.test(n))return n;let e=xt.test(n)?n.match(xt):null;return e?`#${e[1]}${e[1]}${e[2]}${e[2]}${e[3]}${e[3]}`:Ss.test(n)?n.slice(0,7):(console.warn(`[siteping] Invalid accentColor "${n}" \u2014 only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`),kt)}function As(n,e){let t=Math.max(0,Math.round(parseInt(n.slice(1,3),16)*(1-e))),s=Math.max(0,Math.round(parseInt(n.slice(3,5),16)*(1-e))),o=Math.max(0,Math.round(parseInt(n.slice(5,7),16)*(1-e)));return`#${t.toString(16).padStart(2,"0")}${s.toString(16).padStart(2,"0")}${o.toString(16).padStart(2,"0")}`}function Ls(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches}function Ms(n){return n==="dark"||n==="auto"&&Ls()?"dark":"light"}function wt(n=kt,e){let t=Ts(n),s=As(t,.15);return Ms(e)==="dark"?{accent:t,accentLight:t+"22",accentDark:s,accentGlow:t+"44",accentGradient:`linear-gradient(135deg, ${t}, ${s})`,bg:"#0f172a",bgHover:"#1e293b",text:"#f1f5f9",textSecondary:"#94a3b8",textTertiary:"#64748b",border:"#334155",shadow:"rgba(0, 0, 0, 0.3)",glassBg:"rgba(15, 23, 42, 0.78)",glassBgHeavy:"rgba(15, 23, 42, 0.88)",glassBorder:"rgba(51, 65, 85, 0.5)",glassBorderSubtle:"rgba(51, 65, 85, 0.3)",typeQuestion:"#60a5fa",typeChange:"#fbbf24",typeBug:"#f87171",typeOther:"#94a3b8",typeQuestionBg:"rgba(59, 130, 246, 0.15)",typeChangeBg:"rgba(245, 158, 11, 0.15)",typeBugBg:"rgba(239, 68, 68, 0.15)",typeOtherBg:"rgba(100, 116, 139, 0.15)",statusOpen:"#4ade80",statusOpenBg:"rgba(74, 222, 128, 0.15)",statusResolved:"#94a3b8",statusResolvedBg:"rgba(148, 163, 184, 0.15)"}:{accent:t,accentLight:t+"14",accentDark:s,accentGlow:t+"33",accentGradient:`linear-gradient(135deg, ${t}, ${s})`,bg:"#ffffff",bgHover:"#f8f9fb",text:"#0f172a",textSecondary:"#475569",textTertiary:"#64748b",border:"#e2e8f0",shadow:"rgba(0, 0, 0, 0.06)",glassBg:"rgba(255, 255, 255, 0.72)",glassBgHeavy:"rgba(255, 255, 255, 0.85)",glassBorder:"rgba(255, 255, 255, 0.35)",glassBorderSubtle:"rgba(255, 255, 255, 0.18)",typeQuestion:"#3b82f6",typeChange:"#b45309",typeBug:"#ef4444",typeOther:"#64748b",typeQuestionBg:"#eff6ff",typeChangeBg:"#fffbeb",typeBugBg:"#fef2f2",typeOtherBg:"#f8fafc",statusOpen:"#16a34a",statusOpenBg:"#f0fdf4",statusResolved:"#64748b",statusResolvedBg:"#f1f5f9"}}function F(n,e){switch(n){case"question":return e.typeQuestion;case"change":return e.typeChange;case"bug":return e.typeBug;default:return e.typeOther}}function P(n,e){switch(n){case"question":return e.typeQuestionBg;case"change":return e.typeChangeBg;case"bug":return e.typeBugBg;default:return e.typeOtherBg}}function Ct(n){return`
    --sp-accent: ${n.accent};
    --sp-accent-light: ${n.accentLight};
    --sp-accent-dark: ${n.accentDark};
    --sp-accent-glow: ${n.accentGlow};
    --sp-accent-gradient: ${n.accentGradient};
    --sp-bg: ${n.bg};
    --sp-bg-hover: ${n.bgHover};
    --sp-text: ${n.text};
    --sp-text-secondary: ${n.textSecondary};
    --sp-text-tertiary: ${n.textTertiary};
    --sp-border: ${n.border};
    --sp-shadow: ${n.shadow};
    --sp-glass-bg: ${n.glassBg};
    --sp-glass-bg-heavy: ${n.glassBgHeavy};
    --sp-glass-border: ${n.glassBorder};
    --sp-glass-border-subtle: ${n.glassBorderSubtle};
    --sp-type-question: ${n.typeQuestion};
    --sp-type-change: ${n.typeChange};
    --sp-type-bug: ${n.typeBug};
    --sp-type-other: ${n.typeOther};
    --sp-type-question-bg: ${n.typeQuestionBg};
    --sp-type-change-bg: ${n.typeChangeBg};
    --sp-type-bug-bg: ${n.typeBugBg};
    --sp-type-other-bg: ${n.typeOtherBg};
    --sp-radius: 12px;
    --sp-radius-lg: 16px;
    --sp-radius-xl: 20px;
    --sp-radius-full: 9999px;
    --sp-blur: 20px;
    --sp-blur-heavy: 32px;
    --sp-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
    --sp-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04);
    --sp-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
    --sp-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.04);
    --sp-shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
    --sp-font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  `}var ae=class{constructor(e,t){this.colors=e;this.t=t;this.root=p("div",{style:`
        position:fixed;
        z-index:${2147483647};
        width:300px;
        padding:16px;
        border-radius:16px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border:1px solid ${this.colors.glassBorder};
        box-shadow:0 8px 32px ${this.colors.shadow}, 0 2px 8px ${this.colors.shadow};
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        opacity:0;
        transform:translateY(8px) scale(0.98);
        transition:opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1),transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        display:none;
        -webkit-font-smoothing:antialiased;
      `}),this.root.setAttribute("role","dialog"),this.root.setAttribute("aria-modal","true"),this.root.setAttribute("aria-label",this.t("popup.ariaLabel"));let s=[{type:"question",label:this.t("type.question"),icon:ne},{type:"change",label:this.t("type.change"),icon:oe},{type:"bug",label:this.t("type.bug"),icon:ie},{type:"other",label:this.t("type.other"),icon:re}],o=p("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px;"});for(let d of s){let u=document.createElement("button");u.style.cssText=`
        height:44px;
        border-radius:9999px;border:1px solid ${this.colors.border};
        background:${this.colors.glassBg};cursor:pointer;
        display:flex;align-items:center;justify-content:center;gap:5px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:13px;font-weight:500;color:${this.colors.textTertiary};
        transition:all 0.2s ease;
        padding:0 12px;
      `;let b=y(d.icon);b.setAttribute("style","width:13px;height:13px;flex-shrink:0;"),u.appendChild(b);let f=document.createElement("span");h(f,d.label),u.appendChild(f),u.dataset.type=d.type,u.setAttribute("aria-pressed","false"),u.addEventListener("click",()=>{this.selectType(d.type,o)}),u.addEventListener("mouseenter",()=>{if(u.dataset.type!==this.selectedType){let x=P(u.dataset.type??"",this.colors);u.style.background=x,u.style.borderColor=F(u.dataset.type??"",this.colors)+"40"}}),u.addEventListener("mouseleave",()=>{u.dataset.type!==this.selectedType&&(u.style.background=this.colors.glassBg,u.style.borderColor=this.colors.border)}),o.appendChild(u)}this.textarea=document.createElement("textarea"),this.textarea.style.cssText=`
      width:100%;min-height:72px;max-height:152px;
      padding:10px 12px;border-radius:12px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBgHeavy};
      color:${this.colors.text};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;line-height:1.5;resize:vertical;
      outline:none;transition:all 0.2s ease;
      box-sizing:border-box;
    `,this.textarea.placeholder=this.t("popup.placeholder"),this.textarea.maxLength=5e3,this.textarea.setAttribute("aria-label",this.t("popup.textareaAria"));let i=p("div",{style:`
        font-size:11px;color:${this.colors.textTertiary};
        text-align:right;margin-top:4px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        letter-spacing:0.01em;
      `}),r=navigator.userAgentData,a=r?r.platform==="macOS":navigator.platform?.includes("Mac")??/Macintosh|Mac OS X/i.test(navigator.userAgent);h(i,a?this.t("popup.submitHintMac"):this.t("popup.submitHintOther")),this.textarea.addEventListener("focus",()=>{this.textarea.style.borderColor=this.colors.accent,this.textarea.style.boxShadow=`0 0 0 3px ${this.colors.accent}14`,this.textarea.style.background=this.colors.bg}),this.textarea.addEventListener("blur",()=>{this.textarea.style.borderColor=this.colors.border,this.textarea.style.boxShadow="none",this.textarea.style.background=this.colors.glassBgHeavy}),this.textarea.addEventListener("input",()=>{this.updateSubmitState()}),this.textarea.addEventListener("keydown",d=>{d.key==="Enter"&&(d.ctrlKey||d.metaKey)&&(d.preventDefault(),this.submit()),d.key==="Escape"&&this.cancel()});let l=p("div",{style:"display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"}),c=document.createElement("button");c.style.cssText=`
      height:34px;padding:0 16px;border-radius:9999px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `,h(c,this.t("popup.cancel")),c.addEventListener("click",()=>this.cancel()),c.addEventListener("mouseenter",()=>{c.style.borderColor=this.colors.accent,c.style.color=this.colors.accent}),c.addEventListener("mouseleave",()=>{c.style.borderColor=this.colors.border,c.style.color=this.colors.textTertiary}),this.submitBtn=document.createElement("button"),this.submitBtn.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:none;background:${this.colors.accentGradient};
      color:#fff;font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:600;cursor:pointer;
      opacity:0.35;pointer-events:none;
      transition:all 0.2s ease;
      box-shadow:0 2px 8px ${this.colors.accentGlow};
    `,h(this.submitBtn,this.t("popup.submit")),this.submitBtn.addEventListener("click",()=>this.submit()),l.appendChild(c),l.appendChild(this.submitBtn),this.root.appendChild(o),this.root.appendChild(this.textarea),this.root.appendChild(i),this.root.appendChild(l),document.body.appendChild(this.root)}colors;t;root;selectedType=null;textarea;submitBtn;resolve=null;previouslyFocused=null;onKeydownTrap=null;show(e){return new Promise(t=>{this.resolve=t,this.selectedType=null,this.textarea.value="",this.updateSubmitState(),this.resetTypeButtons(),this.previouslyFocused=document.activeElement;let s=220,o=300,i=e.bottom+8,r=e.left;if(i+s>window.innerHeight){let l=e.top-s-8;l>=8?i=l:i=window.innerHeight-s-8}r+o>window.innerWidth&&(r=e.right-o),r=Math.max(8,r),i=Math.max(8,i),this.root.style.top=`${i}px`,this.root.style.left=`${r}px`,this.root.style.display="block",this.onKeydownTrap=l=>{if(l.key==="Tab"){let c=Array.from(this.root.querySelectorAll('button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'));if(c.length===0)return;let d=c[0],u=c[c.length-1];if(!d||!u)return;l.shiftKey?(document.activeElement===d||!this.root.contains(document.activeElement))&&(l.preventDefault(),u.focus()):(document.activeElement===u||!this.root.contains(document.activeElement))&&(l.preventDefault(),d.focus())}},this.root.addEventListener("keydown",this.onKeydownTrap);let a=typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;this.root.style.transition=a?"none":"",requestAnimationFrame(()=>{this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)",this.textarea.focus()})})}selectType(e,t){this.selectedType=e;let s=t.querySelectorAll("button");for(let o of s){let i=o.dataset.type===e,r=F(o.dataset.type??"",this.colors),a=P(o.dataset.type??"",this.colors);o.style.background=i?a:this.colors.glassBg,o.style.borderColor=i?r+"60":this.colors.border,o.style.color=i?r:this.colors.textTertiary,o.style.fontWeight=i?"600":"500",o.setAttribute("aria-pressed",String(i))}this.updateSubmitState()}resetTypeButtons(){let e=this.root.querySelectorAll("button[data-type]");for(let t of e)t.setAttribute("aria-pressed","false"),t.style.background=this.colors.glassBg,t.style.borderColor=this.colors.border,t.style.color=this.colors.textTertiary,t.style.fontWeight="500"}updateSubmitState(){let e=this.selectedType!==null&&this.textarea.value.trim().length>0;this.submitBtn.disabled=!e,this.submitBtn.style.opacity=e?"1":"0.35",this.submitBtn.style.pointerEvents=e?"auto":"none"}submit(){!this.selectedType||!this.textarea.value.trim()||(this.resolve?.({type:this.selectedType,message:this.textarea.value.trim()}),this.resolve=null,this.hideElement())}cancel(){this.resolve?.(null),this.resolve=null,this.hideElement()}hideElement(){this.onKeydownTrap&&(this.root.removeEventListener("keydown",this.onKeydownTrap),this.onKeydownTrap=null),this.root.style.opacity="0",this.root.style.transform="translateY(8px) scale(0.98)",this.previouslyFocused?.focus(),this.previouslyFocused=null,setTimeout(()=>{this.root.style.display="none"},250)}destroy(){this.root.remove()}};var z,Et=!1;async function Fs(){if(z!==void 0)return z;try{let n=await import("./html2canvas-EREDVCVW.js");return z=n.default??n,z}catch(n){return z=null,Et||(Et=!0,console.warn("[siteping] html2canvas import failed unexpectedly. Capture is disabled for this session \u2014 feedbacks are still submitted, just without screenshots. Underlying error:",n)),null}}async function St(n,e){let t=await Fs();if(!t)return null;let s=e?.quality??.85,o=e?.maxWidth??1200;try{let i=await t(document.body,{x:window.scrollX+n.x,y:window.scrollY+n.y,width:n.width,height:n.height,scale:window.devicePixelRatio,useCORS:!0,allowTaint:!0,logging:!1,ignoreElements:u=>u.tagName==="SITEPING-WIDGET"||u.closest?.("siteping-widget")!==null||u.getAttribute?.("data-siteping-ignore")==="true"});if(i.width<=o)return i.toDataURL("image/jpeg",s);let r=o/i.width,a=o,l=Math.round(i.height*r),c=document.createElement("canvas");c.width=a,c.height=l;let d=c.getContext("2d");return d?(d.drawImage(i,0,0,a,l),c.toDataURL("image/jpeg",s)):null}catch(i){return console.warn("[siteping] Screenshot capture failed:",i),null}}var le=class{constructor(e,t,s,o=!1){this.colors=e;this.bus=t;this.t=s;this.enableScreenshot=o;this.popup=new ae(e,s),this.bus.on("annotation:start",()=>this.activate())}colors;bus;t;enableScreenshot;overlay=null;toolbar=null;drawingRect=null;startX=0;startY=0;isDrawing=!1;isActive=!1;popup;savedOverflow="";preActiveFocusElement=null;rafId=null;pendingMoveEvent=null;async maybeCapture(e){return this.enableScreenshot?St(e):null}activate(){if(this.isActive)return;this.isActive=!0,this.preActiveFocusElement=document.activeElement,this.savedOverflow=document.body.style.overflow,document.body.style.overflow="hidden",this.overlay=p("div",{style:`
        position:fixed;inset:0;
        z-index:${2147483646};
        background:rgba(15, 23, 42, 0.04);
        cursor:crosshair;
      `}),this.overlay.setAttribute("aria-hidden","true"),this.toolbar=p("div",{style:`
        position:fixed;top:0;left:0;right:0;
        z-index:${2147483647};
        height:52px;
        background:${this.colors.glassBg};
        backdrop-filter:blur(24px);
        -webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid ${this.colors.glassBorder};
        display:flex;align-items:center;justify-content:center;gap:16px;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:14px;color:${this.colors.text};
        box-shadow:0 4px 16px ${this.colors.shadow};
        -webkit-font-smoothing:antialiased;
      `});let e=p("span",{style:`
        width:8px;height:8px;border-radius:50%;
        background:${this.colors.accent};
        box-shadow:0 0 8px ${this.colors.accentGlow};
        animation:pulse 1.5s ease-in-out infinite;
      `}),t=document.createElement("style");t.textContent=["@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}","@media(prefers-reduced-motion:reduce){@keyframes pulse{from,to{opacity:1}}}"].join(""),this.toolbar.appendChild(t);let s=p("span",{style:"font-weight:500;letter-spacing:-0.01em;"});h(s,this.t("annotator.instruction"));let o=document.createElement("button");o.style.cssText=`
      height:34px;padding:0 18px;border-radius:9999px;
      border:1px solid ${this.colors.border};
      background:${this.colors.glassBg};
      color:${this.colors.textTertiary};font-family:"Inter",system-ui,-apple-system,sans-serif;
      font-size:13px;font-weight:500;cursor:pointer;
      transition:all 0.2s ease;
    `,h(o,this.t("annotator.cancel")),o.addEventListener("click",()=>this.deactivate()),o.addEventListener("mouseenter",()=>{o.style.borderColor=this.colors.typeBug,o.style.color=this.colors.typeBug,o.style.background=this.colors.typeBugBg}),o.addEventListener("mouseleave",()=>{o.style.borderColor=this.colors.border,o.style.color=this.colors.textTertiary,o.style.background=this.colors.glassBg}),this.toolbar.appendChild(e),this.toolbar.appendChild(s),this.toolbar.appendChild(o),this.overlay.addEventListener("mousedown",this.onMouseDown),this.overlay.addEventListener("mousemove",this.onMouseMove),this.overlay.addEventListener("mouseup",this.onMouseUp),this.overlay.addEventListener("touchstart",this.onTouchStart,{passive:!1}),this.overlay.addEventListener("touchmove",this.onTouchMove,{passive:!1}),this.overlay.addEventListener("touchend",this.onTouchEnd),this.overlay.addEventListener("keydown",this.onOverlayKeyDown),this.overlay.setAttribute("tabindex","0"),document.addEventListener("keydown",this.onKeyDown),document.body.appendChild(this.overlay),document.body.appendChild(this.toolbar)}deactivate(){this.isActive&&(this.isActive=!1,this.isDrawing=!1,this.preActiveFocusElement=null,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.pendingMoveEvent=null,document.body.style.overflow=this.savedOverflow,document.removeEventListener("keydown",this.onKeyDown),this.overlay?.remove(),this.toolbar?.remove(),this.drawingRect?.remove(),this.overlay=null,this.toolbar=null,this.drawingRect=null,this.bus.emit("annotation:end"))}onKeyDown=e=>{e.key==="Escape"&&this.deactivate()};onOverlayKeyDown=async e=>{if(e.key!=="Enter")return;e.preventDefault();let t=this.preActiveFocusElement;if(!t||!(t instanceof HTMLElement))return;let s=t.getBoundingClientRect();if(s.width<=0||s.height<=0)return;let o=new DOMRect(s.x,s.y,s.width,s.height),i=await this.popup.show(o);if(!i)return;let a={anchor:Re(t),rect:{xPct:0,yPct:0,wPct:1,hPct:1},scrollX:window.scrollX,scrollY:window.scrollY,viewportW:window.innerWidth,viewportH:window.innerHeight,devicePixelRatio:window.devicePixelRatio},l=await this.maybeCapture(o);this.deactivate(),this.bus.emit("annotation:complete",{annotation:a,type:i.type,message:i.message,screenshotDataUrl:l})};onMouseDown=e=>{this.startDrawing(e.clientX,e.clientY)};onTouchStart=e=>{e.preventDefault();let t=e.touches[0];t&&this.startDrawing(t.clientX,t.clientY)};startDrawing(e,t){this.isDrawing=!0,this.startX=e,this.startY=t,this.drawingRect?.remove(),this.drawingRect=p("div",{style:`
        position:fixed;
        border:2px solid ${this.colors.accent};
        background:${this.colors.accent}12;
        pointer-events:none;
        border-radius:8px;
        box-shadow:0 0 16px ${this.colors.accentGlow};
        transition:box-shadow 0.15s ease;
      `}),this.overlay?.appendChild(this.drawingRect)}onMouseMove=e=>{this.scheduleRectUpdate(e)};onTouchMove=e=>{e.preventDefault(),e.touches[0]&&this.scheduleRectUpdate(e.touches[0])};scheduleRectUpdate(e){!this.isDrawing||!this.drawingRect||(this.pendingMoveEvent=e,this.rafId===null&&(this.rafId=requestAnimationFrame(()=>{this.rafId=null;let t=this.pendingMoveEvent;if(!t||!this.drawingRect)return;let s=Math.min(t.clientX,this.startX),o=Math.min(t.clientY,this.startY),i=Math.abs(t.clientX-this.startX),r=Math.abs(t.clientY-this.startY);this.drawingRect.style.left=`${s}px`,this.drawingRect.style.top=`${o}px`,this.drawingRect.style.width=`${i}px`,this.drawingRect.style.height=`${r}px`})))}onTouchEnd=async e=>{let t=e.changedTouches[0];t&&await this.finishDrawing(t.clientX,t.clientY)};onMouseUp=async e=>{await this.finishDrawing(e.clientX,e.clientY)};finishDrawing=async(e,t)=>{if(!this.isDrawing||!this.drawingRect)return;this.isDrawing=!1;let s=Math.min(e,this.startX),o=Math.min(t,this.startY),i=Math.abs(e-this.startX),r=Math.abs(t-this.startY);if(i<10||r<10){this.drawingRect.remove(),this.drawingRect=null;return}let a=new DOMRect(s,o,i,r),l=await this.popup.show(a);if(!l){this.drawingRect?.remove(),this.drawingRect=null;return}let c=this.buildAnnotation(a);this.drawingRect?.remove(),this.drawingRect=null;let d=await this.maybeCapture(a);this.deactivate(),this.bus.emit("annotation:complete",{annotation:c,type:l.type,message:l.message,screenshotDataUrl:d})};buildAnnotation(e){this.overlay&&(this.overlay.style.pointerEvents="none");let t=ut(e);this.overlay&&(this.overlay.style.pointerEvents="auto");let s=Re(t),o=t.getBoundingClientRect(),i=ht(e,o);return{anchor:s,rect:i,scrollX:window.scrollX,scrollY:window.scrollY,viewportW:window.innerWidth,viewportH:window.innerHeight,devicePixelRatio:window.devicePixelRatio}}destroy(){this.deactivate(),this.popup.destroy()}};var U="siteping_retry_queue";async function K(n,e,t=3){for(let s=0;s<=t;s++){let o=new AbortController,i=setTimeout(()=>o.abort(),1e4);try{let l=await fetch(n,{...e,signal:o.signal});if(clearTimeout(i),l.ok||l.status>=400&&l.status<500||s===t)return l}catch(l){if(clearTimeout(i),s===t)throw l}let r=1e3*2**s,a=Math.random()*1e3-500;await new Promise(l=>setTimeout(l,r+a))}throw new Error("Max retries exceeded")}var Bs="siteping_retry_queue";async function Tt(n){return typeof navigator<"u"&&navigator.locks?navigator.locks.request(Bs,()=>n()):n()}function Rs(n,e){Tt(()=>{try{let t=localStorage.getItem(U),s=t?JSON.parse(t):[],o=Array.isArray(s)?s:[];o.length>=20&&o.shift(),o.push({endpoint:n,payload:e}),localStorage.setItem(U,JSON.stringify(o))}catch{}})}async function At(n){await Tt(async()=>{try{let e=localStorage.getItem(U);if(!e)return;let t=JSON.parse(e),s=Array.isArray(t)?t:[],o=s.filter(a=>a.endpoint===n);if(o.length===0)return;let i=[];for(let a of o)try{(await fetch(n,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a.payload)})).ok||i.push(a)}catch{i.push(a)}let r=s.filter(a=>a.endpoint!==n).concat(i);r.length>0?localStorage.setItem(U,JSON.stringify(r)):localStorage.removeItem(U)}catch{}})}var pe=class{constructor(e,t){this.endpoint=e;this.projectName=t}endpoint;projectName;async sendFeedback(e){try{let t=await K(this.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(e)});if(!t.ok){let s=await t.text().catch(()=>"Unknown error");throw new Error(`Failed to send feedback: ${t.status} ${s}`)}return await t.json()}catch(t){throw Rs(this.endpoint,e),t}}async getFeedbacks(e,t){let s=new URLSearchParams({projectName:e});t?.page&&s.set("page",String(t.page)),t?.limit&&s.set("limit",String(t.limit)),t?.type&&s.set("type",t.type),t?.status&&s.set("status",t.status),t?.search&&s.set("search",t.search),t?.url&&s.set("url",t.url),t?.urlPattern&&s.set("urlPattern",t.urlPattern);let o=await K(`${this.endpoint}?${s.toString()}`,{method:"GET",cache:"no-store"});if(!o.ok)throw new Error(`Failed to fetch feedbacks: ${o.status}`);return await o.json()}async resolveFeedback(e,t){let s=await K(this.endpoint,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e,projectName:this.projectName,status:t?"resolved":"open"})});if(!s.ok)throw new Error(`Failed to update feedback: ${s.status}`);return await s.json()}async deleteFeedback(e){let t=await K(this.endpoint,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e,projectName:this.projectName})});if(!t.ok)throw new Error(`Failed to delete feedback: ${t.status}`)}async deleteAllFeedbacks(e){let t=await K(this.endpoint,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectName:e,deleteAll:!0})});if(!t.ok)throw new Error(`Failed to delete all feedbacks: ${t.status}`)}};var q=class{listeners=new Map;on(e,t){this.listeners.has(e)||this.listeners.set(e,new Set);let s=this.listeners.get(e);return s.add(t),()=>{s.delete(t)}}off(e,t){let s=this.listeners.get(e);s&&s.delete(t)}emit(e,...t){let s=this.listeners.get(e);if(s)for(let o of s)try{o(...t)}catch(i){console.error(`[siteping] Error in event listener for "${String(e)}":`,i)}}removeAll(){this.listeners.clear()}};var Ps=54,ce=class{constructor(e,t,s,o){this.bus=s;this.t=o;let i=t.position??"bottom-right",r=i==="bottom-right";this.items=[{id:"chat",icon:bt,label:o("fab.messages")},{id:"annotate",icon:gt,label:o("fab.annotate")},{id:"toggle-annotations",icon:Ie,iconAlt:De,label:o("fab.annotations")}],this.fab=document.createElement("button"),this.fab.className=`sp-fab sp-fab--${i} sp-anim-fab-in`,this.fab.style.position="fixed",this.fab.appendChild(y(Pe)),this.fab.setAttribute("aria-label",o("fab.aria")),this.fab.setAttribute("aria-expanded","false"),this.fab.addEventListener("click",()=>this.toggle()),this.radialContainer=document.createElement("div"),this.radialContainer.className=`sp-radial sp-radial--${i}`,this.radialContainer.setAttribute("role","menu");for(let c=0;c<this.items.length;c++){let d=this.items[c];if(!d)continue;let u=document.createElement("button");u.className="sp-radial-item",u.style.setProperty("--sp-i",String(c)),u.appendChild(y(d.icon)),u.setAttribute("role","menuitem"),u.setAttribute("aria-label",d.label),u.dataset.itemId=d.id,u.addEventListener("click",f=>{f.stopPropagation(),this.handleItemClick(d.id)});let b=document.createElement("span");b.className="sp-radial-label",b.textContent=d.label,b.style.cssText=r?"position:absolute; right:54px; top:50%; transform:translateY(-50%); white-space:nowrap;":"position:absolute; left:54px; top:50%; transform:translateY(-50%); white-space:nowrap;",u.appendChild(b),this.radialContainer.appendChild(u)}this.root=document.createElement("div"),this.root.appendChild(this.radialContainer),this.root.appendChild(this.fab),e.appendChild(this.root);let a=e.host;this.onDocumentClick=c=>{this.isOpen&&!c.composedPath().includes(a)&&this.close()},document.addEventListener("click",this.onDocumentClick);let l=c=>{c.key==="Escape"&&this.isOpen&&(c.stopPropagation(),this.close())};this.fab.addEventListener("keydown",l),this.radialContainer.addEventListener("keydown",l),this.radialContainer.addEventListener("keydown",c=>{let d=Array.from(this.radialContainer.querySelectorAll(".sp-radial-item"));if(d.length===0||!this.isOpen)return;let u=e.activeElement??document.activeElement,b=d.indexOf(u);switch(c.key){case"ArrowUp":{c.preventDefault();let f=b<=0?d.length-1:b-1;d[f]?.focus();break}case"ArrowDown":{c.preventDefault();let f=b>=d.length-1?0:b+1;d[f]?.focus();break}case"Home":{c.preventDefault(),d[0]?.focus();break}case"End":{c.preventDefault(),d[d.length-1]?.focus();break}}})}bus;t;root;fab;radialContainer;badgeEl=null;isOpen=!1;annotationsVisible=!0;items;onDocumentClick;updateBadge(e){if(e<=0){this.badgeEl?.remove(),this.badgeEl=null;return}this.badgeEl||(this.badgeEl=document.createElement("span"),this.badgeEl.className="sp-fab-badge",this.badgeEl.setAttribute("role","status"),this.badgeEl.setAttribute("aria-live","polite"),this.fab.appendChild(this.badgeEl));let t=e>99?"99+":String(e);h(this.badgeEl,t),this.badgeEl.setAttribute("aria-label",this.t("fab.badge").replace("{count}",String(e)))}toggle(){this.isOpen?this.close():this.open()}open(){this.isOpen=!0,this.setFabIcon(te),this.fab.setAttribute("aria-expanded","true"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach((t,s)=>{let o=-(16+Ps*(s+1));t.style.transform=`translate(0px, ${o}px) scale(1)`,t.classList.add("sp-radial-item--open")}),requestAnimationFrame(()=>{this.radialContainer.querySelector(".sp-radial-item")?.focus()})}close(){this.isOpen=!1,this.setFabIcon(Pe),this.fab.setAttribute("aria-expanded","false"),this.radialContainer.querySelectorAll(".sp-radial-item").forEach(t=>{t.style.transform="translate(0, 0) scale(0.8)",t.classList.remove("sp-radial-item--open")}),this.fab.focus()}setFabIcon(e){let t=this.badgeEl;this.fab.replaceChildren(y(e)),t&&this.fab.appendChild(t)}handleItemClick(e){switch(this.close(),e){case"chat":this.bus.emit("panel:toggle",!0);break;case"annotate":this.bus.emit("annotation:start");break;case"toggle-annotations":{this.annotationsVisible=!this.annotationsVisible,this.bus.emit("annotations:toggle",this.annotationsVisible);let t=this.radialContainer.querySelector('[data-item-id="toggle-annotations"]');t&&t.replaceChildren(y(this.annotationsVisible?Ie:De));break}}}destroy(){document.removeEventListener("click",this.onDocumentClick),this.root.remove()}};var Lt={"panel.title":"Feedbacks","panel.ariaLabel":"Siteping-Feedback-Panel","panel.feedbackList":"Feedbackliste","panel.loading":"Feedbacks werden geladen","panel.close":"Panel schlie\xDFen","panel.deleteAll":"Alle l\xF6schen","panel.deleteAllConfirmTitle":"Alle l\xF6schen","panel.deleteAllConfirmMessage":"Alle Feedbacks f\xFCr dieses Projekt l\xF6schen? Diese Aktion kann nicht r\xFCckg\xE4ngig gemacht werden.","panel.search":"Suchen...","panel.searchAria":"Feedbacks suchen","panel.filterAll":"Alle","panel.loadError":"Laden fehlgeschlagen","panel.retry":"Erneut versuchen","panel.empty":"Noch kein Feedback","panel.showMore":"Mehr anzeigen","panel.showLess":"Weniger anzeigen","panel.resolve":"Erledigen","panel.reopen":"Wieder \xF6ffnen","panel.delete":"L\xF6schen","panel.cancel":"Abbrechen","panel.confirmDelete":"L\xF6schen","panel.loadMore":"Mehr laden ({remaining} verbleibend)","panel.statusAll":"Alle","panel.statusOpen":"Offen","panel.statusResolved":"Erledigt","type.label":"Typ","type.question":"Frage","type.change":"\xC4nderung","type.bug":"Fehler","type.other":"Sonstiges","status.label":"Status","scope.label":"Bereich","scope.thisPage":"Diese Seite","scope.thisType":"Dieser Typ","scope.all":"Alle Seiten","fab.aria":"Siteping \u2014 Feedback-Men\xFC","fab.messages":"Nachrichten","fab.annotate":"Kommentieren","fab.annotations":"Anmerkungen","annotator.instruction":"Zeichne ein Rechteck um den Bereich, den du kommentieren m\xF6chtest","annotator.cancel":"Abbrechen","popup.ariaLabel":"Feedbackformular","popup.placeholder":"Beschreibe dein Feedback...","popup.textareaAria":"Feedbacknachricht","popup.submitHintMac":"\u2318+Enter zum Senden","popup.submitHintOther":"Strg+Enter zum Senden","popup.cancel":"Abbrechen","popup.submit":"Senden","identity.title":"Identifiziere dich","identity.nameLabel":"Name","identity.namePlaceholder":"Dein Name","identity.emailLabel":"E-Mail","identity.emailPlaceholder":"deine@email.de","identity.cancel":"Abbrechen","identity.submit":"Fortfahren","marker.approximate":"Ungef\xE4hre Position (Konfidenz: {confidence}%)","marker.aria":"Feedback #{number}: {type} \u2014 {message}","fab.badge":"{count} unerledigte Feedbacks","feedback.sent.confirmation":"Feedback erfolgreich gesendet","feedback.error.message":"Feedback konnte nicht gesendet werden","feedback.deleted.confirmation":"Feedback gel\xF6scht","badge.count":"{count} unerledigte Feedbacks"};var Mt={"panel.title":"Feedbacks","panel.ariaLabel":"Siteping feedback panel","panel.feedbackList":"Feedback list","panel.loading":"Loading feedbacks","panel.close":"Close panel","panel.deleteAll":"Delete all","panel.deleteAllConfirmTitle":"Delete all","panel.deleteAllConfirmMessage":"Delete all feedbacks for this project? This action cannot be undone.","panel.search":"Search...","panel.searchAria":"Search feedbacks","panel.filterAll":"All","panel.loadError":"Failed to load","panel.retry":"Retry","panel.empty":"No feedback yet","panel.showMore":"Show more","panel.showLess":"Show less","panel.resolve":"Resolve","panel.reopen":"Reopen","panel.delete":"Delete","panel.cancel":"Cancel","panel.confirmDelete":"Delete","panel.loadMore":"Load more ({remaining} remaining)","panel.statusAll":"All","panel.statusOpen":"Open","panel.statusResolved":"Resolved","type.label":"Type","type.question":"Question","type.change":"Change","type.bug":"Bug","type.other":"Other","status.label":"Status","scope.label":"Scope","scope.thisPage":"This page","scope.thisType":"This type","scope.all":"All pages","fab.aria":"Siteping \u2014 Feedback menu","fab.messages":"Messages","fab.annotate":"Annotate","fab.annotations":"Annotations","annotator.instruction":"Draw a rectangle on the area to comment","annotator.cancel":"Cancel","popup.ariaLabel":"Feedback form","popup.placeholder":"Describe your feedback...","popup.textareaAria":"Feedback message","popup.submitHintMac":"\u2318+Enter to send","popup.submitHintOther":"Ctrl+Enter to send","popup.cancel":"Cancel","popup.submit":"Send","identity.title":"Identify yourself","identity.nameLabel":"Name","identity.namePlaceholder":"Your name","identity.emailLabel":"Email","identity.emailPlaceholder":"your@email.com","identity.cancel":"Cancel","identity.submit":"Continue","marker.approximate":"Approximate position (confidence: {confidence}%)","marker.aria":"Feedback #{number}: {type} \u2014 {message}","fab.badge":"{count} unresolved feedbacks","feedback.sent.confirmation":"Feedback sent successfully","feedback.error.message":"Failed to send feedback","feedback.deleted.confirmation":"Feedback deleted","badge.count":"{count} unresolved feedbacks"};var Ft={"panel.title":"Comentarios","panel.ariaLabel":"Panel de comentarios de Siteping","panel.feedbackList":"Lista de comentarios","panel.loading":"Cargando comentarios","panel.close":"Cerrar panel","panel.deleteAll":"Eliminar todo","panel.deleteAllConfirmTitle":"Eliminar todo","panel.deleteAllConfirmMessage":"\xBFEliminar todos los comentarios de este proyecto? Esta acci\xF3n no se puede deshacer.","panel.search":"Buscar...","panel.searchAria":"Buscar comentarios","panel.filterAll":"Todos","panel.loadError":"No se pudo cargar","panel.retry":"Reintentar","panel.empty":"A\xFAn no hay comentarios","panel.showMore":"Mostrar m\xE1s","panel.showLess":"Mostrar menos","panel.resolve":"Resolver","panel.reopen":"Reabrir","panel.delete":"Eliminar","panel.cancel":"Cancelar","panel.confirmDelete":"Eliminar","panel.loadMore":"Cargar m\xE1s ({remaining} restantes)","panel.statusAll":"Todos","panel.statusOpen":"Abiertos","panel.statusResolved":"Resueltos","type.label":"Tipo","type.question":"Pregunta","type.change":"Cambio","type.bug":"Error","type.other":"Otro","status.label":"Estado","scope.label":"\xC1mbito","scope.thisPage":"Esta p\xE1gina","scope.thisType":"Este tipo","scope.all":"Todas las p\xE1ginas","fab.aria":"Siteping \u2014 Men\xFA de comentarios","fab.messages":"Mensajes","fab.annotate":"Anotar","fab.annotations":"Anotaciones","annotator.instruction":"Dibuja un rect\xE1ngulo sobre el \xE1rea que quieres comentar","annotator.cancel":"Cancelar","popup.ariaLabel":"Formulario de comentarios","popup.placeholder":"Describe tu comentario...","popup.textareaAria":"Mensaje de comentario","popup.submitHintMac":"\u2318+Enter para enviar","popup.submitHintOther":"Ctrl+Enter para enviar","popup.cancel":"Cancelar","popup.submit":"Enviar","identity.title":"Identif\xEDcate","identity.nameLabel":"Nombre","identity.namePlaceholder":"Tu nombre","identity.emailLabel":"Correo electr\xF3nico","identity.emailPlaceholder":"tu@email.com","identity.cancel":"Cancelar","identity.submit":"Continuar","marker.approximate":"Posici\xF3n aproximada (confianza: {confidence}%)","marker.aria":"Comentario #{number}: {type} \u2014 {message}","fab.badge":"{count} comentarios sin resolver","feedback.sent.confirmation":"Comentario enviado correctamente","feedback.error.message":"No se pudo enviar el comentario","feedback.deleted.confirmation":"Comentario eliminado","badge.count":"{count} comentarios sin resolver"};var Bt={"panel.title":"Feedbacks","panel.ariaLabel":"Panneau de feedback Siteping","panel.feedbackList":"Liste des feedbacks","panel.loading":"Chargement des feedbacks","panel.close":"Fermer le panneau","panel.deleteAll":"Tout supprimer","panel.deleteAllConfirmTitle":"Tout supprimer","panel.deleteAllConfirmMessage":"Supprimer tous les feedbacks de ce projet ? Cette action est irr\xE9versible.","panel.search":"Rechercher...","panel.searchAria":"Rechercher dans les feedbacks","panel.filterAll":"Tous","panel.loadError":"Erreur de chargement","panel.retry":"R\xE9essayer","panel.empty":"Aucun feedback pour le moment","panel.showMore":"Voir plus","panel.showLess":"Voir moins","panel.resolve":"R\xE9soudre","panel.reopen":"Rouvrir","panel.delete":"Supprimer","panel.cancel":"Annuler","panel.confirmDelete":"Supprimer","panel.loadMore":"Voir plus ({remaining} restants)","panel.statusAll":"Tous","panel.statusOpen":"Ouvert","panel.statusResolved":"R\xE9solu","type.label":"Type","type.question":"Question","type.change":"Changement","type.bug":"Bug","type.other":"Autre","status.label":"Statut","scope.label":"Port\xE9e","scope.thisPage":"Cette page","scope.thisType":"Ce type","scope.all":"Toutes les pages","fab.aria":"Siteping \u2014 Menu feedback","fab.messages":"Messages","fab.annotate":"Annoter","fab.annotations":"Annotations","annotator.instruction":"Tracez un rectangle sur la zone \xE0 commenter","annotator.cancel":"Annuler","popup.ariaLabel":"Formulaire de feedback","popup.placeholder":"D\xE9crivez votre retour...","popup.textareaAria":"Message de feedback","popup.submitHintMac":"\u2318+Entr\xE9e pour envoyer","popup.submitHintOther":"Ctrl+Entr\xE9e pour envoyer","popup.cancel":"Annuler","popup.submit":"Envoyer","identity.title":"Identifiez-vous","identity.nameLabel":"Nom","identity.namePlaceholder":"Votre nom","identity.emailLabel":"Email","identity.emailPlaceholder":"votre@email.com","identity.cancel":"Annuler","identity.submit":"Continuer","marker.approximate":"Position approximative (confiance : {confidence}%)","marker.aria":"Feedback n\xB0{number} : {type} \u2014 {message}","fab.badge":"{count} feedbacks non r\xE9solus","feedback.sent.confirmation":"Feedback envoy\xE9 avec succ\xE8s","feedback.error.message":"\xC9chec de l'envoi du feedback","feedback.deleted.confirmation":"Feedback supprim\xE9","badge.count":"{count} feedbacks non r\xE9solus"};var Rt={"panel.title":"Feedback","panel.ariaLabel":"Pannello feedback di Siteping","panel.feedbackList":"Elenco feedback","panel.loading":"Caricamento feedback","panel.close":"Chiudi pannello","panel.deleteAll":"Elimina tutto","panel.deleteAllConfirmTitle":"Elimina tutto","panel.deleteAllConfirmMessage":"Eliminare tutti i feedback per questo progetto? Questa azione non pu\xF2 essere annullata.","panel.search":"Cerca...","panel.searchAria":"Cerca feedback","panel.filterAll":"Tutti","panel.loadError":"Caricamento non riuscito","panel.retry":"Riprova","panel.empty":"Nessun feedback ancora","panel.showMore":"Mostra di pi\xF9","panel.showLess":"Mostra meno","panel.resolve":"Risolvi","panel.reopen":"Riapri","panel.delete":"Elimina","panel.cancel":"Annulla","panel.confirmDelete":"Elimina","panel.loadMore":"Carica altro ({remaining} rimanenti)","panel.statusAll":"Tutti","panel.statusOpen":"Aperti","panel.statusResolved":"Risolti","type.label":"Tipo","type.question":"Domanda","type.change":"Modifica","type.bug":"Bug","type.other":"Altro","status.label":"Stato","scope.label":"Ambito","scope.thisPage":"Questa pagina","scope.thisType":"Questo tipo","scope.all":"Tutte le pagine","fab.aria":"Siteping \u2014 Menu feedback","fab.messages":"Messaggi","fab.annotate":"Annota","fab.annotations":"Annotazioni","annotator.instruction":"Disegna un rettangolo sull'area da commentare","annotator.cancel":"Annulla","popup.ariaLabel":"Modulo feedback","popup.placeholder":"Descrivi il tuo feedback...","popup.textareaAria":"Messaggio di feedback","popup.submitHintMac":"\u2318+Invio per inviare","popup.submitHintOther":"Ctrl+Invio per inviare","popup.cancel":"Annulla","popup.submit":"Invia","identity.title":"Identificati","identity.nameLabel":"Nome","identity.namePlaceholder":"Il tuo nome","identity.emailLabel":"Email","identity.emailPlaceholder":"tua@email.com","identity.cancel":"Annulla","identity.submit":"Continua","marker.approximate":"Posizione approssimativa (confidenza: {confidence}%)","marker.aria":"Feedback #{number}: {type} \u2014 {message}","fab.badge":"{count} feedback non risolti","feedback.sent.confirmation":"Feedback inviato con successo","feedback.error.message":"Invio del feedback non riuscito","feedback.deleted.confirmation":"Feedback eliminato","badge.count":"{count} feedback non risolti"};var Pt={"panel.title":"Feedbacks","panel.ariaLabel":"Painel de feedback do Siteping","panel.feedbackList":"Lista de feedbacks","panel.loading":"Carregando feedbacks","panel.close":"Fechar painel","panel.deleteAll":"Excluir tudo","panel.deleteAllConfirmTitle":"Excluir tudo","panel.deleteAllConfirmMessage":"Excluir todos os feedbacks deste projeto? Esta a\xE7\xE3o n\xE3o pode ser desfeita.","panel.search":"Pesquisar...","panel.searchAria":"Pesquisar feedbacks","panel.filterAll":"Todos","panel.loadError":"Falha ao carregar","panel.retry":"Tentar novamente","panel.empty":"Nenhum feedback ainda","panel.showMore":"Mostrar mais","panel.showLess":"Mostrar menos","panel.resolve":"Resolver","panel.reopen":"Reabrir","panel.delete":"Excluir","panel.cancel":"Cancelar","panel.confirmDelete":"Excluir","panel.loadMore":"Carregar mais ({remaining} restantes)","panel.statusAll":"Todos","panel.statusOpen":"Abertos","panel.statusResolved":"Resolvidos","type.label":"Tipo","type.question":"Pergunta","type.change":"Altera\xE7\xE3o","type.bug":"Bug","type.other":"Outro","status.label":"Status","scope.label":"Escopo","scope.thisPage":"Esta p\xE1gina","scope.thisType":"Este tipo","scope.all":"Todas as p\xE1ginas","fab.aria":"Siteping \u2014 Menu de feedback","fab.messages":"Mensagens","fab.annotate":"Anotar","fab.annotations":"Anota\xE7\xF5es","annotator.instruction":"Desenhe um ret\xE2ngulo na \xE1rea que deseja comentar","annotator.cancel":"Cancelar","popup.ariaLabel":"Formul\xE1rio de feedback","popup.placeholder":"Descreva seu feedback...","popup.textareaAria":"Mensagem de feedback","popup.submitHintMac":"\u2318+Enter para enviar","popup.submitHintOther":"Ctrl+Enter para enviar","popup.cancel":"Cancelar","popup.submit":"Enviar","identity.title":"Identifique-se","identity.nameLabel":"Nome","identity.namePlaceholder":"Seu nome","identity.emailLabel":"E-mail","identity.emailPlaceholder":"seu@email.com","identity.cancel":"Cancelar","identity.submit":"Continuar","marker.approximate":"Posi\xE7\xE3o aproximada (confian\xE7a: {confidence}%)","marker.aria":"Feedback #{number}: {type} \u2014 {message}","fab.badge":"{count} feedbacks n\xE3o resolvidos","feedback.sent.confirmation":"Feedback enviado com sucesso","feedback.error.message":"Falha ao enviar feedback","feedback.deleted.confirmation":"Feedback exclu\xEDdo","badge.count":"{count} feedbacks n\xE3o resolvidos"};var It={"panel.title":"\u041E\u0431\u0440\u0430\u0442\u043D\u0430\u044F \u0441\u0432\u044F\u0437\u044C","panel.ariaLabel":"\u041F\u0430\u043D\u0435\u043B\u044C \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u0441\u0432\u044F\u0437\u0438 Siteping","panel.feedbackList":"\u0421\u043F\u0438\u0441\u043E\u043A \u043E\u0442\u0437\u044B\u0432\u043E\u0432","panel.loading":"\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043E\u0442\u0437\u044B\u0432\u043E\u0432","panel.close":"\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043F\u0430\u043D\u0435\u043B\u044C","panel.deleteAll":"\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0451","panel.deleteAllConfirmTitle":"\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0451","panel.deleteAllConfirmMessage":"\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0432\u0441\u0435 \u043E\u0442\u0437\u044B\u0432\u044B \u044D\u0442\u043E\u0433\u043E \u043F\u0440\u043E\u0435\u043A\u0442\u0430? \u042D\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435\u043E\u0431\u0440\u0430\u0442\u0438\u043C\u043E.","panel.search":"\u041F\u043E\u0438\u0441\u043A...","panel.searchAria":"\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u043E\u0442\u0437\u044B\u0432\u0430\u043C","panel.filterAll":"\u0412\u0441\u0435","panel.loadError":"\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438","panel.retry":"\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C","panel.empty":"\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u043E\u0442\u0437\u044B\u0432\u043E\u0432","panel.showMore":"\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0435","panel.showLess":"\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043C\u0435\u043D\u044C\u0448\u0435","panel.resolve":"\u0420\u0435\u0448\u0435\u043D\u043E","panel.reopen":"\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0437\u0430\u043D\u043E\u0432\u043E","panel.delete":"\u0423\u0434\u0430\u043B\u0438\u0442\u044C","panel.cancel":"\u041E\u0442\u043C\u0435\u043D\u0430","panel.confirmDelete":"\u0423\u0434\u0430\u043B\u0438\u0442\u044C","panel.loadMore":"\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u0435\u0449\u0451 ({remaining} \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C)","panel.statusAll":"\u0412\u0441\u0435","panel.statusOpen":"\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435","panel.statusResolved":"\u0420\u0435\u0448\u0451\u043D\u043D\u044B\u0435","type.label":"\u0422\u0438\u043F","type.question":"\u0412\u043E\u043F\u0440\u043E\u0441","type.change":"\u0423\u043B\u0443\u0447\u0448\u0435\u043D\u0438\u0435","type.bug":"\u0411\u0430\u0433","type.other":"\u0414\u0440\u0443\u0433\u043E\u0435","status.label":"\u0421\u0442\u0430\u0442\u0443\u0441","scope.label":"\u041E\u0431\u043B\u0430\u0441\u0442\u044C","scope.thisPage":"\u042D\u0442\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430","scope.thisType":"\u042D\u0442\u043E\u0442 \u0442\u0438\u043F","scope.all":"\u0412\u0441\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B","fab.aria":"Siteping \u2014 \u041C\u0435\u043D\u044E \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u0441\u0432\u044F\u0437\u0438","fab.messages":"\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F","fab.annotate":"\u0410\u043D\u043D\u043E\u0442\u0430\u0446\u0438\u044F","fab.annotations":"\u0410\u043D\u043D\u043E\u0442\u0430\u0446\u0438\u0438","annotator.instruction":"\u0412\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u043E\u0431\u043B\u0430\u0441\u0442\u044C \u0434\u043B\u044F \u043A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u044F","annotator.cancel":"\u041E\u0442\u043C\u0435\u043D\u0430","popup.ariaLabel":"\u0424\u043E\u0440\u043C\u0430 \u043E\u0431\u0440\u0430\u0442\u043D\u043E\u0439 \u0441\u0432\u044F\u0437\u0438","popup.placeholder":"\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443 \u0438\u043B\u0438 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435...","popup.textareaAria":"\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435","popup.submitHintMac":"\u2318+Enter \u2014 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C","popup.submitHintOther":"Ctrl+Enter \u2014 \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C","popup.cancel":"\u041E\u0442\u043C\u0435\u043D\u0430","popup.submit":"\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C","identity.title":"\u041F\u0440\u0435\u0434\u0441\u0442\u0430\u0432\u044C\u0442\u0435\u0441\u044C","identity.nameLabel":"\u0418\u043C\u044F","identity.namePlaceholder":"\u0412\u0430\u0448\u0435 \u0438\u043C\u044F","identity.emailLabel":"Email","identity.emailPlaceholder":"\u0432\u0430\u0448@email.com","identity.cancel":"\u041E\u0442\u043C\u0435\u043D\u0430","identity.submit":"\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C","marker.approximate":"\u041F\u0440\u0438\u0431\u043B\u0438\u0437\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u043F\u043E\u0437\u0438\u0446\u0438\u044F (\u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C: {confidence}%)","marker.aria":"\u041E\u0442\u0437\u044B\u0432 #{number}: {type} \u2014 {message}","fab.badge":"\u041D\u0435\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u0445 \u043E\u0442\u0437\u044B\u0432\u043E\u0432: {count}","feedback.sent.confirmation":"\u041E\u0442\u0437\u044B\u0432 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D","feedback.error.message":"\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043E\u0442\u0437\u044B\u0432","feedback.deleted.confirmation":"\u041E\u0442\u0437\u044B\u0432 \u0443\u0434\u0430\u043B\u0451\u043D","badge.count":"\u041D\u0435\u0440\u0435\u0448\u0451\u043D\u043D\u044B\u0445 \u043E\u0442\u0437\u044B\u0432\u043E\u0432: {count}"};var He={de:Lt,en:Mt,es:Ft,fr:Bt,it:Rt,pt:Pt,ru:It};function de(n){let e=(n.split("-")[0]??n).toLowerCase();He[e]||console.warn(`[siteping] Unknown locale "${n}", falling back to "en"`);let t=He[e]??He.en??{};return s=>t[s]??s}function O(n,e){switch(n){case"question":return e("type.question");case"change":return e("type.change");case"bug":return e("type.bug");case"other":return e("type.other");default:return n}}var Dt="siteping_identity";function Ot(){try{let n=localStorage.getItem(Dt);if(!n)return null;let e=JSON.parse(n);if(typeof e=="object"&&e!==null&&"name"in e&&typeof e.name=="string"&&"email"in e&&typeof e.email=="string"){let t=e;if(t.name&&t.email)return t}return null}catch{return null}}function Nt(n){try{localStorage.setItem(Dt,JSON.stringify(n))}catch{}}function Is(n,e){if(n===e)return 0;if(n.length===0)return e.length;if(e.length===0)return n.length;if(n.length>e.length){let r=n;n=e,e=r}let t=n.length,s=e.length,o=new Array(t+1);for(let r=0;r<=t;r++)o[r]=r;let i=new Array(t+1);for(let r=1;r<=s;r++){i[0]=r;for(let l=1;l<=t;l++){let c=o[l-1]??0;i[l]=n[l-1]===e[r-1]?c:1+Math.min(c,o[l]??0,i[l-1]??0)}let a=o;o=i,i=a}return o[t]??0}function $(n,e){if(n===e)return 1;let t=Math.max(n.length,e.length);return t===0?1:1-Is(n,e)/t}function _e(n,e,t=.6){if(!e||!n)return 0;if(n.includes(e))return 1;let s=e.length;if(s>n.length){let a=$(n,e);return a>=t?a:0}let o=0,i=n.length>500?n.slice(0,500):n,r=i.length-s;for(let a=0;a<=r;a++){let l=i.slice(a,a+s),c=$(l,e);if(c>o&&(o=c),o>=.95)break}return o>=t?o:0}var Ds=300,Os=.3;function ue(n,e){if(!e.textSnippet)return!0;let t=(n.textContent?.trim()??"").slice(0,500);return _e(t,e.textSnippet,.5)>Os}function Ns(n){if(n.anchorKey){let e=n.anchorKey.replace(/\\/g,"\\\\").replace(/"/g,'\\"');try{let t=document.querySelector(`[${j}="${e}"]`);if(t&&ue(t,n))return{element:t,confidence:1,strategy:"anchorKey"}}catch{}}if(n.elementId){let e=document.getElementById(n.elementId);if(e&&e.tagName===n.elementTag&&ue(e,n))return{element:e,confidence:1,strategy:"id"}}try{let e=document.querySelector(n.cssSelector);if(e&&e.tagName===n.elementTag&&ue(e,n))return{element:e,confidence:.95,strategy:"css"}}catch{}try{let t=document.evaluate(n.xpath,document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;if(t instanceof Element&&t.tagName===n.elementTag&&ue(t,n))return{element:t,confidence:.9,strategy:"xpath"}}catch{}return Hs(n)}function Hs(n){let e=n.elementTag.toLowerCase(),t=document.querySelectorAll(e);if(t.length===0)return null;let s=null,o=0,i=Math.min(t.length,Ds);for(let r=0;r<i;r++){let a=t[r];if(!a)continue;let l=_s(a,n);if(l>o&&(o=l,s=a,o>=.85))break}return!s||o<.4?null:{element:s,confidence:Math.min(o,.85),strategy:"scan"}}function _s(n,e){let t=0,s=0,o=(n.textContent?.trim()??"").slice(0,500);if(e.textSnippet&&(s+=40,t+=_e(o,e.textSnippet,.5)*40),e.fingerprint&&(s+=20,t+=pt(n,e.fingerprint)*20),e.textPrefix||e.textSuffix){s+=20;let i=0,r=0;if(e.textPrefix){let a=_(n,"before");i+=a?$(a,e.textPrefix):0,r++}if(e.textSuffix){let a=_(n,"after");i+=a?$(a,e.textSuffix):0,r++}r>0&&(t+=i/r*20)}if(e.neighborText){s+=20;let i=Z(n);t+=i?$(i,e.neighborText)*20:0}return s>0?t/s:0}function he(n,e){let t=Ns(n);if(!t)return null;let s=t.element.getBoundingClientRect(),o=new DOMRect(s.x+e.xPct*s.width,s.y+e.yPct*s.height,e.wPct*s.width,e.hPct*s.height);return{element:t.element,rect:o,confidence:t.confidence,strategy:t.strategy}}function $e(n){return{cssSelector:n.cssSelector,xpath:n.xpath,textSnippet:n.textSnippet,elementTag:n.elementTag,elementId:n.elementId??void 0,textPrefix:n.textPrefix,textSuffix:n.textSuffix,fingerprint:n.fingerprint,neighborText:n.neighborText,anchorKey:n.anchorKey??null}}function be(n){return{xPct:n.xPct,yPct:n.yPct,wPct:n.wPct,hPct:n.hPct}}var Ht=13;function _t(n){return{top:n.top+window.scrollY-Ht,left:n.right+window.scrollX-Ht}}function Y(n,e){let t=n.entries[e],s=n.elementIndices[e];if(!(!t||s===void 0))return t.elements[s]}var $t=300,jt=200,$s=.7,js=28,zt=32,ge=class{constructor(e,t,s,o){this.colors=e;this.tooltip=t;this.bus=s;this.t=o;this.container=p("div",{style:`position:absolute;top:0;left:0;pointer-events:none;z-index:${2147483646};`}),this.container.id="siteping-markers",document.body.appendChild(this.container),this.bus.on("annotations:toggle",i=>{this.container.style.display=i?"block":"none"}),this.resizeHandler=()=>this.scheduleReposition(),window.addEventListener("resize",this.resizeHandler,{passive:!0}),this.scrollHandler=()=>this.scheduleReposition(),window.addEventListener("scroll",this.scrollHandler,{passive:!0,capture:!0}),this.mutationObserver=new MutationObserver(i=>{let r=!1;for(let a of i)if(!(this.container.contains(a.target)||this.tooltip.contains(a.target))){r=!0;break}r&&this.scheduleReposition()}),this.mutationObserver.observe(document.body,{childList:!0,subtree:!0,attributes:!1,characterData:!1}),this.onDocumentClickForClusters=i=>{this.container.contains(i.target)||this.collapseAllClusters()},document.addEventListener("click",this.onDocumentClickForClusters)}colors;tooltip;bus;t;container;entries=[];highlightElements=[];pinnedFeedback=null;onDocumentClick=null;repositionTimer=null;mutationObserver=null;scrollHandler=null;resizeHandler=null;anchorCache=new Map;clusters=[];onDocumentClickForClusters=null;get count(){return this.entries.length}scheduleReposition(){this.repositionTimer||("requestIdleCallback"in window?this.repositionTimer=window.requestIdleCallback(()=>{this.repositionTimer=null,this.repositionAll()},{timeout:jt+100}):this.repositionTimer=+setTimeout(()=>{this.repositionTimer=null,this.repositionAll()},jt))}repositionAll(){let e=new Set;for(let t of this.entries)for(let s=0;s<t.feedback.annotations.length;s++){let o=t.elements[s];if(!o)continue;let i=t.feedback.annotations[s];if(!i)continue;let r=`${t.feedback.id}:${s}`;e.add(r);let l=this.anchorCache.get(r)?.deref(),c;if(l?.isConnected){let u=l.getBoundingClientRect(),b=be(i);c={element:l,rect:new DOMRect(u.left+b.xPct*u.width,u.top+b.yPct*u.height,b.wPct*u.width,b.hPct*u.height),confidence:1,strategy:"css"}}else c=he($e(i),be(i)),c?.element&&this.anchorCache.set(r,new WeakRef(c.element));if(!c){o.style.display="none";continue}let d=_t(c.rect);t.baseTop=d.top,t.baseLeft=d.left,o.style.display="flex",this.applyConfidenceStyle(o,c.confidence,t.feedback)}for(let t of this.anchorCache.keys())e.has(t)||this.anchorCache.delete(t);this.applyClusterPositions(),this.pinnedFeedback&&this.showHighlight(this.pinnedFeedback)}applyClusterPositions(){for(let e of this.clusters)e.expanded?this.applyFanPositions(e):this.applyStackPositions(e)}render(e){this.clear(),e.forEach((t,s)=>{let o=this.buildEntry(t,s+1);this.entries.push(o)}),this.buildClusters()}addFeedback(e,t){let s=this.buildEntry(e,t);for(let o of s.elements)o.style.animation="sp-marker-in 0.35s cubic-bezier(0.34,1.56,0.64,1) both";this.entries.push(s),this.buildClusters()}buildEntry(e,t){let s={feedback:e,elements:[],baseTop:0,baseLeft:0};for(let o of e.annotations){let i=he($e(o),be(o));if(!i)continue;let r=_t(i.rect);s.baseTop=r.top,s.baseLeft=r.left;let a=this.createMarker(t,e,r);this.applyConfidenceStyle(a,i.confidence,e),this.container.appendChild(a),s.elements.push(a)}return s}buildClusters(){for(let s of this.container.querySelectorAll(".sp-cluster-badge"))s.remove();let e=[];for(let s of this.entries)for(let o=0;o<s.elements.length;o++)e.push({entry:s,elIdx:o});let t=new Set;this.clusters=[];for(let s=0;s<e.length;s++){if(t.has(s))continue;let o=e[s];if(!o)continue;let i={entries:[o.entry],elementIndices:[o.elIdx],expanded:!1};t.add(s);for(let r=s+1;r<e.length;r++){if(t.has(r))continue;let a=o.entry,l=e[r];if(!l)continue;let c=l.entry;Math.sqrt((a.baseLeft-c.baseLeft)**2+(a.baseTop-c.baseTop)**2)<js&&(i.entries.push(c),i.elementIndices.push(l.elIdx),t.add(r))}this.clusters.push(i)}for(let s of this.clusters)s.entries.length<=1||(this.applyStackPositions(s),this.addClusterBadge(s))}applyStackPositions(e){let t=e.entries[0];if(!t)return;let{baseTop:s,baseLeft:o}=t,i=e.entries.length<=1;for(let r=0;r<e.entries.length;r++){let a=Y(e,r);a&&(a.style.top=`${s+(i?0:r*3)}px`,a.style.left=`${o+(i?0:r*3)}px`,a.style.zIndex=String(r+1))}}applyFanPositions(e){let t=e.entries[0];if(!t)return;let{baseTop:s,baseLeft:o}=t,i=e.entries.length,r=(i-1)*zt,a=o-r/2;for(let l=0;l<i;l++){let c=Y(e,l);c&&(c.style.top=`${s}px`,c.style.left=`${a+l*zt}px`,c.style.zIndex=String(10+l))}}addClusterBadge(e){let t=Y(e,e.entries.length-1);if(!t)return;let s=p("div",{class:"sp-cluster-badge",style:`
        position:absolute;top:-6px;right:-6px;
        min-width:16px;height:16px;padding:0 4px;
        border-radius:9999px;
        background:${this.colors.accent};color:#fff;
        font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        border:1.5px solid #fff;
        pointer-events:none;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        line-height:1;
      `});h(s,String(e.entries.length)),t.appendChild(s)}setBadgesVisible(e,t){for(let s=0;s<e.entries.length;s++){let o=Y(e,s)?.querySelector(".sp-cluster-badge");o&&(o.style.display=t?"flex":"none")}}findCluster(e){for(let t of this.clusters)if(!(t.entries.length<=1)){for(let s=0;s<t.entries.length;s++)if(Y(t,s)===e)return t}return null}handleClusterClick(e,t){let s=this.findCluster(e);return s?s.expanded?!1:(t.stopPropagation(),this.collapseAllClusters(),s.expanded=!0,this.applyFanPositions(s),this.setBadgesVisible(s,!1),!0):!1}collapseCluster(e){e.expanded&&(e.expanded=!1,this.applyStackPositions(e),this.setBadgesVisible(e,!0))}collapseAllClusters(){for(let e of this.clusters)this.collapseCluster(e)}applyConfidenceStyle(e,t,s){let o=s.status==="resolved";t<$s&&!o?(e.style.borderStyle="dashed",e.style.opacity="0.7",e.title=this.t("marker.approximate").replace("{confidence}",String(Math.round(t*100)))):(e.style.borderStyle="solid",e.style.opacity="1",e.title="")}createMarker(e,t,s){let o=F(t.type,this.colors),i=t.status==="resolved",r=p("div",{style:`
        position:absolute;
        top:${s.top}px;
        left:${s.left}px;
        width:26px;height:26px;
        border-radius:50%;
        background:${i?"rgba(241,245,249,0.9)":"rgba(255,255,255,0.92)"};
        border:2px solid ${i?"#cbd5e1":o};
        display:flex;align-items:center;justify-content:center;
        font-family:"Inter",system-ui,-apple-system,sans-serif;
        font-size:11px;font-weight:700;
        color:${i?"#94a3b8":o};
        cursor:pointer;pointer-events:auto;
        box-shadow:${i?"0 2px 8px rgba(0,0,0,0.06)":`0 2px 12px ${o}25, 0 2px 6px rgba(0,0,0,0.06)`};
        transition:top 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.15s ease, box-shadow 0.15s ease;
        user-select:none;
        -webkit-font-smoothing:antialiased;
      `});r.dataset.feedbackId=t.id,r.setAttribute("tabindex","0"),r.setAttribute("role","button");let a=t.message.length>60?`${t.message.slice(0,60)}...`:t.message,l=this.t("marker.aria").replace("{number}",String(e)).replace("{type}",O(t.type,this.t)).replace("{message}",a);r.setAttribute("aria-label",l),r.setAttribute("aria-describedby",this.tooltip.tooltipId),h(r,i?"\u2713":String(e)),r.addEventListener("mouseenter",()=>{r.style.transform="scale(1.2)",r.style.boxShadow=i?"0 4px 16px rgba(0,0,0,0.1)":`0 4px 20px ${o}35, 0 4px 12px rgba(0,0,0,0.08)`,this.tooltip.show(t,r.getBoundingClientRect()),this.pinnedFeedback||this.showHighlight(t)}),r.addEventListener("mouseleave",()=>{r.style.transform="scale(1)",r.style.boxShadow=i?"0 2px 8px rgba(0,0,0,0.06)":`0 2px 12px ${o}25, 0 2px 6px rgba(0,0,0,0.06)`,this.tooltip.scheduleHide(),this.pinnedFeedback||this.clearHighlight()});let c=d=>{d instanceof MouseEvent&&this.handleClusterClick(r,d)||(this.pinHighlight(t),this.bus.emit("panel:toggle",!0),r.dispatchEvent(new CustomEvent("sp-marker-click",{detail:{feedbackId:t.id},bubbles:!0})))};return r.addEventListener("click",d=>c(d)),r.addEventListener("keydown",d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),c(d))}),r}highlight(e){for(let t of this.entries)if(t.feedback.id===e)for(let s of t.elements)s.style.animation="sp-pulse-ring 0.7s ease-out",s.addEventListener("animationend",()=>{s.style.animation=""},{once:!0})}showHighlight(e){this.removeHighlightElements();for(let t of e.annotations){let s=he($e(t),be(t));if(!s)continue;let o=F(e.type,this.colors),i=s.rect,r=p("div",{style:`
          position:absolute;
          top:${i.top+window.scrollY}px;
          left:${i.left+window.scrollX}px;
          width:${i.width}px;height:${i.height}px;
          border:2px solid ${o};
          background:${o}0c;
          border-radius:8px;
          pointer-events:none;z-index:-1;
          opacity:0;
          box-shadow:0 0 16px ${o}20;
          transition:opacity ${$t}ms ease;
        `});this.container.appendChild(r),this.highlightElements.push(r),r.offsetHeight,r.style.opacity="1"}}pinHighlight(e){this.unpinHighlight(),this.showHighlight(e),this.pinnedFeedback=e,this.onDocumentClick=t=>{this.container.contains(t.target)||this.unpinHighlight()},document.addEventListener("click",this.onDocumentClick,{capture:!0})}unpinHighlight(){this.onDocumentClick&&(document.removeEventListener("click",this.onDocumentClick,{capture:!0}),this.onDocumentClick=null),this.pinnedFeedback=null,this.clearHighlight()}clearHighlight(){for(let e of this.highlightElements)e.style.opacity="0",setTimeout(()=>e.remove(),$t);this.highlightElements=[]}removeHighlightElements(){for(let e of this.highlightElements)e.remove();this.highlightElements=[]}clear(){this.unpinHighlight(),this.container.replaceChildren(),this.entries=[],this.clusters=[],this.anchorCache.clear()}destroy(){this.unpinHighlight(),this.repositionTimer&&("cancelIdleCallback"in window&&window.cancelIdleCallback(this.repositionTimer),clearTimeout(this.repositionTimer)),this.resizeHandler&&window.removeEventListener("resize",this.resizeHandler),this.scrollHandler&&window.removeEventListener("scroll",this.scrollHandler,{capture:!0}),this.onDocumentClickForClusters&&document.removeEventListener("click",this.onDocumentClickForClusters),this.mutationObserver?.disconnect(),this.container.remove()}};var zs='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',Ks='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',Us='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H6a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2"/><path d="M16 3h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-2"/></svg>',je={"export.label":"Export","export.csv":"Export CSV","export.json":"Export JSON"},qt={"export.label":"Exporter","export.csv":"Exporter CSV","export.json":"Exporter JSON"},Yt=`
  /* ============================
     Export Button & Menu
     ============================ */

  .sp-export-btn {
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: transparent;
    color: var(--sp-text-tertiary);
    font-family: var(--sp-font);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.2s ease;
    position: relative;
  }

  .sp-export-btn svg {
    width: 13px;
    height: 13px;
  }

  .sp-export-btn:hover {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  .sp-export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-export-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 180px;
    padding: 4px;
    border-radius: var(--sp-radius);
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur));
    -webkit-backdrop-filter: blur(var(--sp-blur));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-lg);
    z-index: 10;
    opacity: 0;
    transform: translateY(-4px) scale(0.97);
    transition: opacity 0.15s ease, transform 0.15s ease;
    pointer-events: none;
  }

  .sp-export-menu--open {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  .sp-export-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
  }

  .sp-export-option:hover,
  .sp-export-option:focus-visible {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
  }

  .sp-export-option-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sp-export-option-icon svg {
    width: 16px;
    height: 16px;
  }

  .sp-export-option-label {
    flex: 1;
  }

  @media (forced-colors: active) {
    .sp-export-btn,
    .sp-export-option,
    .sp-export-menu {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-export-btn:focus-visible,
    .sp-export-option:focus-visible {
      outline: 3px solid Highlight !important;
    }
  }
`,Kt=["id","type","status","message","url","authorName","authorEmail","createdAt","resolvedAt","viewport"];function qs(n){return n.includes('"')||n.includes(",")||n.includes(`
`)||n.includes("\r")?`"${n.replace(/"/g,'""')}"`:n}function Ys(n){let e=Kt.join(","),t=n.map(s=>Kt.map(o=>{let i=s[o];return qs(i==null?"":String(i))}).join(","));return[e,...t].join(`
`)}function Ws(n){return JSON.stringify(n,null,2)}function Ut(n,e,t){let s=new Blob([n],{type:t}),o=URL.createObjectURL(s),i=document.createElement("a");i.href=o,i.download=e,i.style.display="none",document.body.appendChild(i),i.click(),requestAnimationFrame(()=>{URL.revokeObjectURL(o),i.remove()})}var me=class{constructor(e,t){this.getFeedbacks=t;this.element=p("div",{style:"position: relative; display: inline-flex;"});let s=document.createElement("button");s.className="sp-export-btn",s.setAttribute("aria-haspopup","true"),s.setAttribute("aria-expanded","false"),s.appendChild(y(zs));let o=document.createElement("span");h(o,je["export.label"]),s.appendChild(o),s.addEventListener("click",a=>{a.stopPropagation(),this.toggle()}),this.menu=p("div",{class:"sp-export-menu"}),this.menu.setAttribute("role","menu");let i=this.createOption(Ks,je["export.csv"],()=>{this.exportAs("csv")}),r=this.createOption(Us,je["export.json"],()=>{this.exportAs("json")});this.menu.appendChild(i),this.menu.appendChild(r),this.element.appendChild(s),this.element.appendChild(this.menu),this.onDocumentClick=a=>{this.isOpen&&!this.element.contains(a.target)&&this.close()},document.addEventListener("click",this.onDocumentClick,!0)}getFeedbacks;element;menu;isOpen=!1;onDocumentClick;setLabels(e){let t=this.element.querySelector(".sp-export-btn");if(t){let o=t.querySelector("span");o&&h(o,e["export.label"])}let s=this.menu.querySelectorAll(".sp-export-option-label");s[0]&&h(s[0],e["export.csv"]),s[1]&&h(s[1],e["export.json"])}createOption(e,t,s){let o=document.createElement("button");o.className="sp-export-option",o.setAttribute("role","menuitem");let i=p("span",{class:"sp-export-option-icon"});i.appendChild(y(e));let r=p("span",{class:"sp-export-option-label"});return h(r,t),o.appendChild(i),o.appendChild(r),o.addEventListener("click",a=>{a.stopPropagation(),s(),this.close()}),o}toggle(){this.isOpen?this.close():this.open()}open(){this.isOpen=!0,this.menu.classList.add("sp-export-menu--open"),this.element.querySelector(".sp-export-btn")?.setAttribute("aria-expanded","true")}close(){this.isOpen=!1,this.menu.classList.remove("sp-export-menu--open"),this.element.querySelector(".sp-export-btn")?.setAttribute("aria-expanded","false")}exportAs(e){let t=this.getFeedbacks();if(t.length===0)return;let s=t[0]?.projectName??"feedbacks",o=new Date().toISOString().slice(0,10),i=s.replace(/[^a-zA-Z0-9_-]/g,"_");if(e==="csv"){let r=Ys(t);Ut(r,`feedbacks-${i}-${o}.csv`,"text/csv;charset=utf-8")}else{let r=Ws(t);Ut(r,`feedbacks-${i}-${o}.json`,"application/json;charset=utf-8")}}destroy(){document.removeEventListener("click",this.onDocumentClick,!0),this.element.remove()}};var fe='<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="4" stroke="currentColor" stroke-width="2"/></svg>',Wt='<svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="1" y="1" width="16" height="16" rx="4" fill="url(#sp-cb-grad)" stroke="none"/><polyline points="5 9 8 12 13 6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><defs><linearGradient id="sp-cb-grad" x1="0" y1="0" x2="18" y2="18" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="var(--sp-accent)"/><stop offset="100%" stop-color="var(--sp-accent-dark)"/></linearGradient></defs></svg>',ze={"bulk.selectAll":"Select all","bulk.selected":"{count} selected","bulk.resolve":"Resolve","bulk.delete":"Delete","bulk.deselect":"Deselect"},Ke={"bulk.selectAll":"Tout s\xE9lectionner","bulk.selected":"{count} s\xE9lectionn\xE9(s)","bulk.resolve":"R\xE9soudre","bulk.delete":"Supprimer","bulk.deselect":"D\xE9s\xE9lectionner"},Xt=`
  /* ============================
     Bulk Checkbox
     ============================ */

  .sp-bulk-checkbox {
    position: relative;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 4px;
    color: var(--sp-border);
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease, transform 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .sp-bulk-checkbox svg {
    width: 16px;
    height: 16px;
    display: block;
  }

  .sp-bulk-checkbox:hover {
    color: var(--sp-accent);
    transform: scale(1.1);
  }

  .sp-bulk-checkbox--checked {
    color: var(--sp-accent);
    opacity: 1 !important;
    filter: drop-shadow(0 0 4px var(--sp-accent-glow));
  }

  /* Show checkboxes when hovering a card */
  .sp-card:hover .sp-bulk-checkbox {
    opacity: 1;
  }

  /* When any card has selection, show ALL checkboxes */
  .sp-list--has-selection .sp-bulk-checkbox {
    opacity: 1;
  }

  /* ============================
     Card Selected State
     ============================ */

  .sp-card--selected {
    border-left: 3px solid var(--sp-accent) !important;
    background: var(--sp-accent-light) !important;
  }

  .sp-card--selected:hover {
    background: var(--sp-accent-light) !important;
  }

  /* ============================
     Select All Bar
     ============================ */

  .sp-bulk-select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 4px;
    border-radius: var(--sp-radius);
    background: transparent;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease, background 0.2s ease;
    user-select: none;
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    color: var(--sp-text-secondary);
  }

  .sp-bulk-select-all:hover {
    background: var(--sp-bg-hover);
  }

  /* Show select-all on list hover or when selections exist */
  .sp-list:hover .sp-bulk-select-all,
  .sp-list--has-selection .sp-bulk-select-all {
    opacity: 1;
  }

  .sp-bulk-select-all .sp-bulk-checkbox {
    opacity: 1;
  }

  /* ============================
     Floating Action Bar
     ============================ */

  @keyframes sp-bulk-bar-in {
    from {
      transform: translateY(100%) scale(0.95);
      opacity: 0;
    }
    to {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
  }

  @keyframes sp-bulk-bar-out {
    from {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    to {
      transform: translateY(100%) scale(0.95);
      opacity: 0;
    }
  }

  .sp-bulk-bar {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 16px;
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-xl);
    z-index: 10;
    pointer-events: none;
    opacity: 0;
    transform: translateY(100%) scale(0.95);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.25s ease;
    font-family: var(--sp-font);
  }

  .sp-bulk-bar--visible {
    pointer-events: auto;
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .sp-bulk-bar-count {
    font-size: 13px;
    font-weight: 600;
    color: var(--sp-text);
    white-space: nowrap;
    letter-spacing: -0.01em;
  }

  .sp-bulk-bar-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-bulk-btn-resolve,
  .sp-bulk-btn-delete {
    padding: 7px 14px;
    border-radius: var(--sp-radius-full);
    border: 1.5px solid transparent;
    background: transparent;
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .sp-bulk-btn-resolve {
    color: #22c55e;
    border-color: #22c55e;
  }

  .sp-bulk-btn-resolve:hover {
    background: rgba(34, 197, 94, 0.1);
    box-shadow: 0 0 12px rgba(34, 197, 94, 0.15);
  }

  .sp-bulk-btn-resolve:active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  .sp-bulk-btn-delete {
    color: #ef4444;
    border-color: #ef4444;
  }

  .sp-bulk-btn-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
  }

  .sp-bulk-btn-delete:active {
    transform: scale(0.96);
    transition-duration: 0.1s;
  }

  .sp-bulk-btn-resolve:disabled,
  .sp-bulk-btn-delete:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .sp-bulk-btn-deselect {
    width: 28px;
    height: 28px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: transparent;
    color: var(--sp-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;
  }

  .sp-bulk-btn-deselect:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
    border-color: var(--sp-text-tertiary);
  }

  .sp-bulk-btn-deselect:active {
    transform: scale(0.92);
    transition-duration: 0.1s;
  }

  .sp-bulk-btn-deselect svg {
    width: 12px;
    height: 12px;
  }

  /* Spinner inside bulk bar buttons */
  .sp-bulk-btn-resolve .sp-spinner,
  .sp-bulk-btn-delete .sp-spinner {
    width: 14px;
    height: 14px;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-bulk-checkbox,
    .sp-bulk-btn-resolve,
    .sp-bulk-btn-delete,
    .sp-bulk-btn-deselect,
    .sp-bulk-bar {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-bulk-checkbox--checked {
      background: Highlight !important;
      color: HighlightText !important;
    }

    .sp-card--selected {
      border-left: 4px solid Highlight !important;
    }
  }

  /* ============================
     Reduced Motion
     ============================ */

  @media (prefers-reduced-motion: reduce) {
    .sp-bulk-bar {
      transition-duration: 0.01ms !important;
    }

    .sp-bulk-checkbox {
      transition-duration: 0.01ms !important;
    }
  }
`,ve=class{constructor(e,t,s){this.callbacks=t;this.i18n=s==="fr"?Ke:ze,this.barElement=p("div",{class:"sp-bulk-bar"}),this.barElement.setAttribute("role","toolbar"),this.barElement.setAttribute("aria-label","Bulk actions"),this.countLabel=p("span",{class:"sp-bulk-bar-count"}),h(this.countLabel,this.i18n["bulk.selected"].replace("{count}","0"));let o=p("div",{class:"sp-bulk-bar-actions"});this.resolveBtn=document.createElement("button"),this.resolveBtn.className="sp-bulk-btn-resolve",this.resolveBtn.type="button",this.resolveBtn.addEventListener("click",()=>this.handleResolve()),this.deleteBtn=document.createElement("button"),this.deleteBtn.className="sp-bulk-btn-delete",this.deleteBtn.type="button",this.deleteBtn.addEventListener("click",()=>this.handleDelete());let i=document.createElement("button");i.className="sp-bulk-btn-deselect",i.type="button",i.setAttribute("aria-label",this.i18n["bulk.deselect"]),i.appendChild(y('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>')),i.addEventListener("click",()=>this.deselectAll()),o.appendChild(this.resolveBtn),o.appendChild(this.deleteBtn),o.appendChild(i),this.barElement.appendChild(this.countLabel),this.barElement.appendChild(o),this.updateButtonLabels()}callbacks;barElement;selected=new Set;checkboxMap=new Map;countLabel;resolveBtn;deleteBtn;selectAllCheckbox=null;listContainer=null;isProcessing=!1;i18n;createCheckbox(e){let t=p("div",{class:"sp-bulk-checkbox"});return t.setAttribute("role","checkbox"),t.setAttribute("aria-checked","false"),t.setAttribute("tabindex","0"),t.setAttribute("aria-label",`Select feedback ${e}`),t.appendChild(y(fe)),t.addEventListener("click",s=>{s.stopPropagation(),this.toggle(e)}),t.addEventListener("keydown",s=>{(s.key===" "||s.key==="Enter")&&(s.preventDefault(),s.stopPropagation(),this.toggle(e))}),this.checkboxMap.set(e,t),t}createSelectAllBar(e,t){let s=p("div",{class:"sp-bulk-select-all"}),o=p("div",{class:"sp-bulk-checkbox"});o.appendChild(y(fe)),this.selectAllCheckbox=o;let i=p("span");return h(i,t),s.appendChild(o),s.appendChild(i),s.addEventListener("click",()=>{this.selected.size===e.length&&e.length>0?this.deselectAll():this.selectAll(e)}),s}setListContainer(e){this.listContainer=e}toggle(e){this.isProcessing||(this.selected.has(e)?this.selected.delete(e):this.selected.add(e),this.updateCheckbox(e),this.updateBar(),this.updateSelectAllCheckbox(),this.updateListSelectionClass(),this.updateCardSelectedState(e))}selectAll(e){if(!this.isProcessing){for(let t of e)this.selected.add(t),this.updateCheckbox(t),this.updateCardSelectedState(t);this.updateBar(),this.updateSelectAllCheckbox(),this.updateListSelectionClass()}}deselectAll(){let e=[...this.selected];this.selected.clear();for(let t of e)this.updateCheckbox(t),this.updateCardSelectedState(t);this.updateBar(),this.updateSelectAllCheckbox(),this.updateListSelectionClass()}get selectedIds(){return[...this.selected]}get count(){return this.selected.size}get hasSelection(){return this.selected.size>0}reset(){this.selected.clear(),this.checkboxMap.clear(),this.selectAllCheckbox=null,this.isProcessing=!1,this.updateBar(),this.updateListSelectionClass()}destroy(){this.selected.clear(),this.checkboxMap.clear(),this.selectAllCheckbox=null,this.listContainer=null,this.barElement.remove()}updateBar(){let e=this.selected.size,t=e>0;this.barElement.classList.toggle("sp-bulk-bar--visible",t),h(this.countLabel,this.i18n["bulk.selected"].replace("{count}",String(e))),this.updateButtonLabels()}updateButtonLabels(){let e=this.selected.size;this.resolveBtn.replaceChildren();let t=document.createElement("span");h(t,e>0?`${this.i18n["bulk.resolve"]} ${e}`:this.i18n["bulk.resolve"]),this.resolveBtn.appendChild(t),this.deleteBtn.replaceChildren();let s=document.createElement("span");h(s,e>0?`${this.i18n["bulk.delete"]} ${e}`:this.i18n["bulk.delete"]),this.deleteBtn.appendChild(s)}updateCheckbox(e){let t=this.checkboxMap.get(e);if(!t)return;let s=this.selected.has(e);t.classList.toggle("sp-bulk-checkbox--checked",s),t.setAttribute("aria-checked",String(s)),t.replaceChildren(),t.appendChild(y(s?Wt:fe))}updateSelectAllCheckbox(){if(!this.selectAllCheckbox)return;let e=this.selected.size>0&&this.selected.size===this.checkboxMap.size;this.selectAllCheckbox.classList.toggle("sp-bulk-checkbox--checked",e),this.selectAllCheckbox.setAttribute("aria-checked",String(e)),this.selectAllCheckbox.replaceChildren(),this.selectAllCheckbox.appendChild(y(e?Wt:fe))}updateListSelectionClass(){this.listContainer&&this.listContainer.classList.toggle("sp-list--has-selection",this.selected.size>0)}updateCardSelectedState(e){if(!this.listContainer)return;let t=CSS.escape(e),s=this.listContainer.querySelector(`[data-feedback-id="${t}"]`);s&&s.classList.toggle("sp-card--selected",this.selected.has(e))}setButtonLoading(e){let t=Array.from(e.childNodes).map(s=>s.cloneNode(!0));return e.disabled=!0,e.replaceChildren(p("div",{class:"sp-spinner sp-spinner--sm"})),()=>{e.replaceChildren(...t),e.disabled=!1}}async handleResolve(){if(this.isProcessing||this.selected.size===0)return;this.isProcessing=!0;let e=[...this.selected],t=this.setButtonLoading(this.resolveBtn);this.deleteBtn.disabled=!0;try{await this.callbacks.onResolve(e),this.reset()}catch{t(),this.deleteBtn.disabled=!1}finally{this.isProcessing=!1}}async handleDelete(){if(this.isProcessing||this.selected.size===0)return;this.isProcessing=!0;let e=[...this.selected],t=this.setButtonLoading(this.deleteBtn);this.resolveBtn.disabled=!0;try{await this.callbacks.onDelete(e),this.reset()}catch{t(),this.resolveBtn.disabled=!1}finally{this.isProcessing=!1}}};var Xs='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',Ue='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',Gs='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',Vs='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',Qs='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',Js='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',qe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',Gt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>',Vt='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',Zs='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',en='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',tn={"detail.back":"Back","detail.title":"Feedback #{number}","detail.status":"Status","detail.message":"Message","detail.screenshot":"Screenshot","detail.screenshotAlt":"Screenshot of the annotated area","detail.metadata":"Details","detail.annotation":"Annotation","detail.page":"Page","detail.author":"Author","detail.date":"Created","detail.viewport":"Viewport","detail.browser":"Browser","detail.resolvedAt":"Resolved at","detail.goToAnnotation":"Go to annotation","detail.element":"Element","detail.selector":"Selector","detail.position":"Position","detail.resolve":"Resolve","detail.reopen":"Reopen","detail.delete":"Delete"},Ye={"detail.back":"Retour","detail.title":"Feedback n\xB0{number}","detail.status":"Statut","detail.message":"Message","detail.screenshot":"Capture d'\xE9cran","detail.screenshotAlt":"Capture d'\xE9cran de la zone annot\xE9e","detail.metadata":"D\xE9tails","detail.annotation":"Annotation","detail.page":"Page","detail.author":"Auteur","detail.date":"Cr\xE9\xE9 le","detail.viewport":"Viewport","detail.browser":"Navigateur","detail.resolvedAt":"R\xE9solu le","detail.goToAnnotation":"Aller \xE0 l'annotation","detail.element":"\xC9l\xE9ment","detail.selector":"S\xE9lecteur","detail.position":"Position","detail.resolve":"R\xE9soudre","detail.reopen":"Rouvrir","detail.delete":"Supprimer"},Zt=`
  /* ============================
     Detail View \u2014 Panel-in-Panel
     ============================ */

  .sp-detail {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--sp-glass-bg);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    z-index: 20;
    transform: translateX(100%);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    will-change: transform;
    overflow: hidden;
  }

  .sp-detail--visible {
    transform: translateX(0);
  }

  /* ---- Header ---- */

  .sp-detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--sp-border);
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur));
    -webkit-backdrop-filter: blur(var(--sp-blur));
    flex-shrink: 0;
    min-height: 64px;
  }

  .sp-detail-back {
    width: 40px;
    height: 40px;
    border-radius: var(--sp-radius);
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sp-text-tertiary);
    transition: all 0.2s ease;
    flex-shrink: 0;
    padding: 0;
  }

  .sp-detail-back:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }

  .sp-detail-back:active {
    transform: scale(0.92);
    transition-duration: 0.1s;
  }

  .sp-detail-back svg {
    width: 18px;
    height: 18px;
  }

  .sp-detail-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--sp-text);
    letter-spacing: -0.02em;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-detail-header .sp-badge {
    flex-shrink: 0;
  }

  /* ---- Content ---- */

  .sp-detail-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
  }

  .sp-detail-content::-webkit-scrollbar {
    width: 6px;
  }

  .sp-detail-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .sp-detail-content::-webkit-scrollbar-thumb {
    background: var(--sp-border);
    border-radius: var(--sp-radius-full);
  }

  .sp-detail-content::-webkit-scrollbar-thumb:hover {
    background: var(--sp-text-tertiary);
  }

  /* ---- Section ---- */

  .sp-detail-section {
    padding: 20px 24px;
    border-bottom: 1px solid var(--sp-border);
    opacity: 0;
    transform: translateY(8px);
    animation: sp-detail-section-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes sp-detail-section-in {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .sp-detail-section:last-child {
    border-bottom: none;
  }

  .sp-detail-section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--sp-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-detail-section-title svg {
    width: 14px;
    height: 14px;
    opacity: 0.6;
  }

  /* ---- Status + Actions Section ---- */

  .sp-detail-status {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .sp-detail-status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border-radius: var(--sp-radius-full);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .sp-detail-status-pill--open {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .sp-detail-status-pill--resolved {
    background: rgba(156, 163, 175, 0.1);
    color: #9ca3af;
    border: 1px solid rgba(156, 163, 175, 0.2);
  }

  .sp-detail-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sp-detail-actions {
    display: flex;
    gap: 8px;
  }

  .sp-detail-actions button {
    flex: 1;
    height: 40px;
    padding: 0 16px;
    border-radius: var(--sp-radius);
    font-family: var(--sp-font);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all 0.2s ease;
  }

  .sp-detail-actions button svg {
    width: 15px;
    height: 15px;
  }

  .sp-detail-btn-resolve {
    border: 1.5px solid #22c55e;
    background: rgba(34, 197, 94, 0.06);
    color: #22c55e;
  }

  .sp-detail-btn-resolve:hover {
    background: rgba(34, 197, 94, 0.14);
    box-shadow: 0 0 16px rgba(34, 197, 94, 0.12);
    transform: translateY(-1px);
  }

  .sp-detail-btn-resolve:active {
    transform: translateY(0) scale(0.98);
    transition-duration: 0.1s;
  }

  .sp-detail-btn-reopen {
    border: 1.5px solid var(--sp-accent);
    background: var(--sp-accent-light);
    color: var(--sp-accent);
  }

  .sp-detail-btn-reopen:hover {
    background: rgba(var(--sp-accent), 0.14);
    box-shadow: 0 0 16px var(--sp-accent-glow);
    transform: translateY(-1px);
  }

  .sp-detail-btn-reopen:active {
    transform: translateY(0) scale(0.98);
    transition-duration: 0.1s;
  }

  .sp-detail-btn-delete {
    border: 1.5px solid #ef4444;
    background: rgba(239, 68, 68, 0.06);
    color: #ef4444;
  }

  .sp-detail-btn-delete:hover {
    background: rgba(239, 68, 68, 0.14);
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.12);
    transform: translateY(-1px);
  }

  .sp-detail-btn-delete:active {
    transform: translateY(0) scale(0.98);
    transition-duration: 0.1s;
  }

  .sp-detail-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
    transform: none;
    box-shadow: none;
  }

  /* ---- Message Section ---- */

  .sp-detail-message {
    font-size: 14px;
    line-height: 1.65;
    color: var(--sp-text);
    padding: 14px 16px;
    border-left: 3px solid var(--sp-accent);
    border-radius: 0 var(--sp-radius) var(--sp-radius) 0;
    background: var(--sp-glass-bg-heavy);
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ---- Screenshot Section ---- */

  .sp-detail-screenshot {
    display: block;
    width: 100%;
    height: auto;
    max-height: 400px;
    object-fit: contain;
    border-radius: var(--sp-radius);
    border: 1px solid var(--sp-glass-border);
    background: var(--sp-glass-bg-heavy);
  }

  /* ---- Metadata Section ---- */

  .sp-detail-meta {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .sp-detail-meta-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .sp-detail-meta-row svg {
    width: 14px;
    height: 14px;
    color: var(--sp-text-tertiary);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .sp-detail-meta-content {
    flex: 1;
    min-width: 0;
  }

  .sp-detail-meta-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--sp-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
    margin-bottom: 4px;
  }

  .sp-detail-meta-value {
    font-size: 13px;
    line-height: 1.4;
    color: var(--sp-text);
    word-break: break-all;
  }

  .sp-detail-meta-value--mono {
    font-family: "SF Mono", "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 12px;
    background: var(--sp-glass-bg-heavy);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--sp-glass-border-subtle);
  }

  .sp-detail-meta-value--secondary {
    color: var(--sp-text-secondary);
    font-size: 12px;
  }

  /* ---- Annotation Section ---- */

  .sp-detail-annotation {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sp-detail-annotation-info {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px;
    border-radius: var(--sp-radius);
    background: var(--sp-glass-bg-heavy);
    border: 1px solid var(--sp-glass-border-subtle);
  }

  .sp-detail-annotation-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .sp-detail-annotation-row svg {
    width: 13px;
    height: 13px;
    color: var(--sp-text-tertiary);
    flex-shrink: 0;
    margin-top: 2px;
  }

  .sp-detail-annotation-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--sp-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    line-height: 1;
    margin-bottom: 3px;
  }

  .sp-detail-annotation-value {
    font-size: 12px;
    line-height: 1.4;
    color: var(--sp-text);
    word-break: break-all;
  }

  .sp-detail-annotation-value--mono {
    font-family: "SF Mono", "Cascadia Code", "Fira Code", "Consolas", monospace;
    font-size: 11px;
    background: var(--sp-bg-hover);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-detail-btn-goto {
    width: 100%;
    height: 44px;
    padding: 0 20px;
    border-radius: var(--sp-radius);
    border: none;
    background: var(--sp-accent-gradient);
    color: #fff;
    font-family: var(--sp-font);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.25s ease;
    box-shadow: 0 2px 12px var(--sp-accent-glow);
  }

  .sp-detail-btn-goto svg {
    width: 16px;
    height: 16px;
  }

  .sp-detail-btn-goto:hover {
    box-shadow: 0 4px 20px var(--sp-accent-glow);
    transform: translateY(-2px);
  }

  .sp-detail-btn-goto:active {
    transform: translateY(0) scale(0.98);
    transition-duration: 0.1s;
  }

  /* ---- Forced Colors / High Contrast ---- */

  @media (forced-colors: active) {
    .sp-detail {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
    }

    .sp-detail-back,
    .sp-detail-btn-goto,
    .sp-detail-btn-resolve,
    .sp-detail-btn-reopen,
    .sp-detail-btn-delete {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-detail-back:focus-visible,
    .sp-detail-btn-goto:focus-visible,
    .sp-detail-btn-resolve:focus-visible,
    .sp-detail-btn-reopen:focus-visible,
    .sp-detail-btn-delete:focus-visible {
      outline: 3px solid Highlight !important;
    }

    .sp-detail-status-pill {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-detail-message {
      border-left: 3px solid ButtonText !important;
    }
  }

  /* ---- Reduced Motion ---- */

  @media (prefers-reduced-motion: reduce) {
    .sp-detail {
      transition-duration: 0.01ms !important;
    }

    .sp-detail-section {
      animation-duration: 0.01ms !important;
    }
  }
`;function sn(n){if(/Edg\//i.test(n)){let e=n.match(/Edg\/([\d.]+)/);return e?`Edge ${e[1]}`:"Edge"}if(/OPR\//i.test(n)||/Opera/i.test(n)){let e=n.match(/OPR\/([\d.]+)/);return e?`Opera ${e[1]}`:"Opera"}if(/Firefox\//i.test(n)){let e=n.match(/Firefox\/([\d.]+)/);return e?`Firefox ${e[1]}`:"Firefox"}if(/Chrome\//i.test(n)&&!/Chromium/i.test(n)){let e=n.match(/Chrome\/([\d.]+)/);return e?`Chrome ${e[1]}`:"Chrome"}if(/Safari\//i.test(n)&&!/Chrome/i.test(n)){let e=n.match(/Version\/([\d.]+)/);return e?`Safari ${e[1]}`:"Safari"}return"Unknown"}function Qt(n,e){try{return new Date(n).toLocaleString(e,{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}catch{return n}}function nn(n){try{return new URL(n).pathname}catch{return n}}function on(n){return!!(/^data:image\/(jpeg|png|webp);/i.test(n)||/^https:\/\//i.test(n)||/^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?\//i.test(n))}function Jt(n,e){return n.length<=e?n:n.slice(0,e-1)+"\u2026"}var ye=class{constructor(e,t,s){this.colors=e;this.callbacks=t;this.i18n=s.startsWith("fr")?Ye:tn,this.element=p("div",{class:"sp-detail"}),this.element.setAttribute("role","dialog"),this.element.setAttribute("aria-label","Feedback detail"),this.element.setAttribute("aria-hidden","true");let o=p("div",{class:"sp-detail-header"}),i=document.createElement("button");i.type="button",i.className="sp-detail-back",i.setAttribute("aria-label",this.i18n["detail.back"]),i.appendChild(y(Xs)),i.addEventListener("click",()=>{this.hide(),this.callbacks.onBack()}),this.element.appendChild(o),o.appendChild(i),this.content=p("div",{class:"sp-detail-content"}),this.element.appendChild(this.content)}colors;callbacks;element;_isVisible=!1;currentFeedback=null;content;i18n;resolveBtn=null;deleteBtn=null;isProcessing=!1;show(e,t){this.currentFeedback=e,this.isProcessing=!1;let s=this.element.querySelector(".sp-detail-header");if(!s)return;let o=s.querySelector(".sp-detail-back");if(!o)return;s.replaceChildren(o);let i=p("span",{class:"sp-detail-title"});h(i,this.i18n["detail.title"].replace("{number}",String(t))),s.appendChild(i);let r=p("span",{class:"sp-badge"});r.style.background=P(e.type,this.colors),r.style.color=F(e.type,this.colors),h(r,e.type),s.appendChild(r),this.content.replaceChildren();let a=0,l=this.buildSection(a++);this.buildStatusActions(l,e),this.content.appendChild(l);let c=this.buildSection(a++),d=p("div",{class:"sp-detail-section-title"});h(d,this.i18n["detail.message"]),c.appendChild(d);let u=p("div",{class:"sp-detail-message"});if(u.style.borderLeftColor=F(e.type,this.colors),h(u,e.message),c.appendChild(u),this.content.appendChild(c),e.screenshotUrl&&on(e.screenshotUrl)){let x=this.buildSection(a++),w=p("div",{class:"sp-detail-section-title"});h(w,this.i18n["detail.screenshot"]),x.appendChild(w);let C=document.createElement("img");C.className="sp-detail-screenshot",C.src=e.screenshotUrl,C.alt=this.i18n["detail.screenshotAlt"],C.loading="lazy",C.referrerPolicy="no-referrer",x.appendChild(C),this.content.appendChild(x)}let b=this.buildSection(a++),f=p("div",{class:"sp-detail-section-title"});if(h(f,this.i18n["detail.metadata"]),b.appendChild(f),this.buildMetadata(b,e),this.content.appendChild(b),e.annotations.length>0){let x=this.buildSection(a++),w=p("div",{class:"sp-detail-section-title"});w.appendChild(y(Ue));let C=p("span");h(C,this.i18n["detail.annotation"]),w.appendChild(C),x.appendChild(w),this.buildAnnotation(x,e),this.content.appendChild(x)}this._isVisible=!0,this.element.setAttribute("aria-hidden","false"),this.element.offsetHeight,this.element.classList.add("sp-detail--visible"),requestAnimationFrame(()=>{o.focus()})}hide(){this._isVisible&&(this._isVisible=!1,this.element.classList.remove("sp-detail--visible"),this.element.setAttribute("aria-hidden","true"),this.currentFeedback=null,this.resolveBtn=null,this.deleteBtn=null)}get isVisible(){return this._isVisible}destroy(){this.hide(),this.element.remove()}buildSection(e){let t=p("div",{class:"sp-detail-section"});return t.style.animationDelay=`${e*40}ms`,t}buildStatusActions(e,t){let s=t.status==="resolved",o=p("div",{class:"sp-detail-section-title"});h(o,this.i18n["detail.status"]),e.appendChild(o);let i=p("div",{class:"sp-detail-status"}),r=p("span",{class:`sp-detail-status-pill ${s?"sp-detail-status-pill--resolved":"sp-detail-status-pill--open"}`}),a=p("span",{class:"sp-detail-status-dot"});a.style.background=s?"#9ca3af":"#22c55e",r.appendChild(a);let l=p("span");h(l,s?this.i18n["detail.reopen"]:this.i18n["detail.resolve"]),h(l,s?"Resolved":"Open"),r.appendChild(l),i.appendChild(r),e.appendChild(i);let c=p("div",{class:"sp-detail-actions"});if(this.resolveBtn=document.createElement("button"),this.resolveBtn.type="button",s){this.resolveBtn.className="sp-detail-btn-reopen",this.resolveBtn.appendChild(y(Gt));let u=document.createElement("span");h(u,this.i18n["detail.reopen"]),this.resolveBtn.appendChild(u)}else{this.resolveBtn.className="sp-detail-btn-resolve",this.resolveBtn.appendChild(y(qe));let u=document.createElement("span");h(u,this.i18n["detail.resolve"]),this.resolveBtn.appendChild(u)}this.resolveBtn.addEventListener("click",()=>this.handleResolve()),this.deleteBtn=document.createElement("button"),this.deleteBtn.type="button",this.deleteBtn.className="sp-detail-btn-delete",this.deleteBtn.appendChild(y(Vt));let d=document.createElement("span");h(d,this.i18n["detail.delete"]),this.deleteBtn.appendChild(d),this.deleteBtn.addEventListener("click",()=>this.handleDelete()),c.appendChild(this.resolveBtn),c.appendChild(this.deleteBtn),e.appendChild(c)}buildMetadata(e,t){let s=p("div",{class:"sp-detail-meta"});if(this.addMetaRow(s,Gs,this.i18n["detail.page"],()=>{let o=p("div",{class:"sp-detail-meta-value"}),i=nn(t.url);return h(o,Jt(i,60)),o.title=t.url,o}),this.addMetaRow(s,Vs,this.i18n["detail.author"],()=>{let o=p("div",{class:"sp-detail-meta-value"}),i=t.authorName||"Anonymous",r=t.authorEmail;return h(o,r?`${i} (${r})`:i),o}),this.addMetaRow(s,Qs,this.i18n["detail.date"],()=>{let o=p("div",{class:"sp-detail-meta-value"});return h(o,Qt(t.createdAt,this.i18n===Ye?"fr":"en")),o}),this.addMetaRow(s,Js,this.i18n["detail.viewport"],()=>{let o=p("div",{class:"sp-detail-meta-value sp-detail-meta-value--mono"});return h(o,t.viewport||"Unknown"),o}),this.addMetaRow(s,'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',this.i18n["detail.browser"],()=>{let o=p("div",{class:"sp-detail-meta-value"});return h(o,sn(t.userAgent)),o}),t.resolvedAt){let o=t.resolvedAt;this.addMetaRow(s,qe,this.i18n["detail.resolvedAt"],()=>{let i=p("div",{class:"sp-detail-meta-value sp-detail-meta-value--secondary"});return h(i,Qt(o,this.i18n===Ye?"fr":"en")),i})}e.appendChild(s)}addMetaRow(e,t,s,o){let i=p("div",{class:"sp-detail-meta-row"});i.appendChild(y(t));let r=p("div",{class:"sp-detail-meta-content"}),a=p("div",{class:"sp-detail-meta-label"});h(a,s),r.appendChild(a),r.appendChild(o()),i.appendChild(r),e.appendChild(i)}buildAnnotation(e,t){let s=t.annotations[0];if(!s)return;let o=p("div",{class:"sp-detail-annotation"}),i=p("div",{class:"sp-detail-annotation-info"});this.addAnnotationRow(i,Zs,this.i18n["detail.element"],()=>{let l=p("span",{class:"sp-detail-annotation-value sp-detail-annotation-value--mono"}),c=s.elementId?`<${s.elementTag}#${s.elementId}>`:`<${s.elementTag}>`;return h(l,c),l}),this.addAnnotationRow(i,en,this.i18n["detail.selector"],()=>{let l=p("span",{class:"sp-detail-annotation-value sp-detail-annotation-value--mono"});return h(l,Jt(s.cssSelector,60)),l.title=s.cssSelector,l}),this.addAnnotationRow(i,Ue,this.i18n["detail.position"],()=>{let l=p("span",{class:"sp-detail-annotation-value"});return h(l,`${s.xPct.toFixed(1)}%, ${s.yPct.toFixed(1)}%`+(s.wPct>0||s.hPct>0?` (${s.wPct.toFixed(1)}% \xD7 ${s.hPct.toFixed(1)}%)`:"")),l}),o.appendChild(i);let r=document.createElement("button");r.type="button",r.className="sp-detail-btn-goto",r.appendChild(y(Ue));let a=document.createElement("span");h(a,this.i18n["detail.goToAnnotation"]),r.appendChild(a),r.addEventListener("click",()=>{this.currentFeedback&&this.callbacks.onGoToAnnotation(this.currentFeedback)}),o.appendChild(r),e.appendChild(o)}addAnnotationRow(e,t,s,o){let i=p("div",{class:"sp-detail-annotation-row"});i.appendChild(y(t));let r=p("div",{class:"sp-detail-meta-content"}),a=p("div",{class:"sp-detail-annotation-label"});h(a,s),r.appendChild(a),r.appendChild(o()),i.appendChild(r),e.appendChild(i)}async handleResolve(){if(!(this.isProcessing||!this.currentFeedback)){this.isProcessing=!0,this.resolveBtn&&this.setButtonLoading(this.resolveBtn),this.deleteBtn&&(this.deleteBtn.disabled=!0);try{await this.callbacks.onResolve(this.currentFeedback)}catch{this.isProcessing=!1,this.resolveBtn&&this.restoreResolveBtn(this.currentFeedback),this.deleteBtn&&(this.deleteBtn.disabled=!1)}}}async handleDelete(){if(!(this.isProcessing||!this.currentFeedback)){this.isProcessing=!0,this.deleteBtn&&this.setButtonLoading(this.deleteBtn),this.resolveBtn&&(this.resolveBtn.disabled=!0);try{await this.callbacks.onDelete(this.currentFeedback)}catch{this.isProcessing=!1,this.deleteBtn&&this.restoreDeleteBtn(),this.resolveBtn&&(this.resolveBtn.disabled=!1)}}}setButtonLoading(e){e.disabled=!0,e.replaceChildren(p("div",{class:"sp-spinner sp-spinner--sm"}))}restoreResolveBtn(e){if(!this.resolveBtn)return;this.resolveBtn.disabled=!1,this.resolveBtn.replaceChildren();let t=e.status==="resolved";this.resolveBtn.appendChild(y(t?Gt:qe));let s=document.createElement("span");h(s,t?this.i18n["detail.reopen"]:this.i18n["detail.resolve"]),this.resolveBtn.appendChild(s)}restoreDeleteBtn(){if(!this.deleteBtn)return;this.deleteBtn.disabled=!1,this.deleteBtn.replaceChildren(),this.deleteBtn.appendChild(y(Vt));let e=document.createElement("span");h(e,this.i18n["detail.delete"]),this.deleteBtn.appendChild(e)}};var rn='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5h10"/><path d="M11 9h7"/><path d="M11 13h4"/><path d="M3 17l3 3 3-3"/><path d="M6 18V4"/></svg>',ts='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',an='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>',ln={"sort.newest":"Newest first","sort.oldest":"Oldest first","sort.byType":"By type","sort.openFirst":"Open first","sort.label":"Sort","group.byPage":"By page","group.feedbacks":"{count} feedbacks"},pn={"sort.newest":"Plus r\xE9cents","sort.oldest":"Plus anciens","sort.byType":"Par type","sort.openFirst":"Ouverts d'abord","sort.label":"Trier","group.byPage":"Par page","group.feedbacks":"{count} feedbacks"},es={question:0,change:1,bug:2,other:3};function ss(n,e){let t=[...n];switch(e){case"newest":t.sort((s,o)=>new Date(o.createdAt).getTime()-new Date(s.createdAt).getTime());break;case"oldest":t.sort((s,o)=>new Date(s.createdAt).getTime()-new Date(o.createdAt).getTime());break;case"by-type":t.sort((s,o)=>{let i=es[s.type]??99,r=es[o.type]??99;return i!==r?i-r:new Date(o.createdAt).getTime()-new Date(s.createdAt).getTime()});break;case"open-first":t.sort((s,o)=>{let i=s.status==="open"?0:1,r=o.status==="open"?0:1;return i!==r?i-r:new Date(o.createdAt).getTime()-new Date(s.createdAt).getTime()});break}return t}function cn(n){try{return new URL(n).pathname}catch{return n}}function dn(n,e){if(n.length<=e)return n;let t="\u2026",s=Math.floor((e-1)/2);return n.slice(0,s)+t+n.slice(-s)}function ns(n){let e=new Map;for(let s of n){let o=cn(s.url),i=e.get(o);i?i.push(s):e.set(o,[s])}return new Map([...e.entries()].sort((s,o)=>o[1].length-s[1].length))}function os(n,e,t){let s=p("div",{class:"sp-group-header"});s.setAttribute("role","button"),s.setAttribute("tabindex","0"),s.setAttribute("aria-expanded","true"),s.style.borderBottomColor=t.border;let o=p("span",{class:"sp-group-header-chevron"});o.appendChild(y(an)),s.appendChild(o);let i=p("span",{class:"sp-group-header-icon"});i.appendChild(y(ts)),s.appendChild(i);let r=p("span",{class:"sp-group-header-path"}),a=dn(n,40);h(r,a),n.length>40&&(r.title=n),s.appendChild(r);let l=p("span",{class:"sp-group-header-count"});l.style.background=t.accentLight,l.style.color=t.accent,h(l,String(e)),s.appendChild(l);let c=()=>{let d=s.getAttribute("aria-expanded")==="true";s.setAttribute("aria-expanded",String(!d)),s.classList.toggle("sp-group-header--collapsed",d);let u=s.nextElementSibling;u?.classList.contains("sp-group-content")&&u.classList.toggle("sp-group-content--collapsed",d)};return s.addEventListener("click",c),s.addEventListener("keydown",d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),c())}),s}var xe=class{element;_sortMode="newest";_groupByPage=!1;menuEl=null;sortBtn;groupToggle;i18n;colors;onChange;outsideClickHandler=null;constructor(e,t,s){this.colors=e,this.onChange=t,this.i18n=s==="fr"?pn:ln,this.element=p("div",{class:"sp-sort-controls"}),this.sortBtn=document.createElement("button"),this.sortBtn.className="sp-sort-btn",this.sortBtn.setAttribute("aria-haspopup","listbox"),this.sortBtn.setAttribute("aria-expanded","false"),this.sortBtn.setAttribute("aria-label",this.i18n["sort.label"]);let o=y(rn);this.sortBtn.appendChild(o);let i=p("span",{class:"sp-sort-btn-label"});h(i,this.i18n["sort.newest"]),this.sortBtn.appendChild(i),this.sortBtn.addEventListener("click",l=>{l.stopPropagation(),this.toggleMenu()}),this.groupToggle=document.createElement("button"),this.groupToggle.className="sp-group-toggle",this.groupToggle.setAttribute("aria-pressed","false");let r=y(ts);this.groupToggle.appendChild(r);let a=p("span",{class:"sp-group-toggle-label"});h(a,this.i18n["group.byPage"]),this.groupToggle.appendChild(a),this.groupToggle.addEventListener("click",()=>{this._groupByPage=!this._groupByPage,this.groupToggle.classList.toggle("sp-group-toggle--active",this._groupByPage),this.groupToggle.setAttribute("aria-pressed",String(this._groupByPage)),this.onChange()}),this.element.appendChild(this.sortBtn),this.element.appendChild(this.groupToggle)}get sortMode(){return this._sortMode}get groupByPage(){return this._groupByPage}toggleMenu(){if(this.menuEl){this.closeMenu();return}this.openMenu()}openMenu(){this.menuEl=p("div",{class:"sp-sort-menu"}),this.menuEl.setAttribute("role","listbox"),this.menuEl.setAttribute("aria-label",this.i18n["sort.label"]),this.sortBtn.setAttribute("aria-expanded","true");let e=[{mode:"newest",label:this.i18n["sort.newest"]},{mode:"oldest",label:this.i18n["sort.oldest"]},{mode:"by-type",label:this.i18n["sort.byType"]},{mode:"open-first",label:this.i18n["sort.openFirst"]}];for(let t of e){let s=document.createElement("button");s.className=`sp-sort-option${t.mode===this._sortMode?" sp-sort-option--active":""}`,s.setAttribute("role","option"),s.setAttribute("aria-selected",String(t.mode===this._sortMode)),t.mode===this._sortMode&&(s.style.background=this.colors.accentLight,s.style.color=this.colors.accent),h(s,t.label),s.addEventListener("click",o=>{o.stopPropagation(),this._sortMode=t.mode,this.updateSortLabel(),this.closeMenu(),this.onChange()}),this.menuEl.appendChild(s)}this.element.appendChild(this.menuEl),requestAnimationFrame(()=>{this.outsideClickHandler=t=>{this.menuEl&&!this.element.contains(t.target)&&this.closeMenu()},document.addEventListener("click",this.outsideClickHandler,!0)}),this.menuEl.addEventListener("keydown",t=>{t.key==="Escape"&&(this.closeMenu(),this.sortBtn.focus())})}closeMenu(){this.menuEl&&(this.menuEl.remove(),this.menuEl=null),this.sortBtn.setAttribute("aria-expanded","false"),this.outsideClickHandler&&(document.removeEventListener("click",this.outsideClickHandler,!0),this.outsideClickHandler=null)}updateSortLabel(){let e={newest:this.i18n["sort.newest"],oldest:this.i18n["sort.oldest"],"by-type":this.i18n["sort.byType"],"open-first":this.i18n["sort.openFirst"]},t=this.sortBtn.querySelector(".sp-sort-btn-label");t&&h(t,e[this._sortMode])}destroy(){this.closeMenu()}},is=`
  /* ============================
     Sort Controls Container
     ============================ */

  .sp-sort-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--sp-border);
  }

  /* ============================
     Sort Dropdown Button
     ============================ */

  .sp-sort-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: var(--sp-glass-bg-heavy);
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    position: relative;
  }

  .sp-sort-btn svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .sp-sort-btn:hover {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  .sp-sort-btn[aria-expanded="true"] {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  /* ============================
     Sort Floating Menu
     ============================ */

  .sp-sort-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 170px;
    padding: 4px;
    border-radius: var(--sp-radius);
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-md);
    z-index: 10;
    animation: sp-sort-menu-in 0.15s ease-out both;
  }

  @keyframes sp-sort-menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* ============================
     Sort Menu Option
     ============================ */

  .sp-sort-option {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: all 0.15s ease;
  }

  .sp-sort-option:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }

  .sp-sort-option--active {
    font-weight: 600;
  }

  .sp-sort-option--active:hover {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
  }

  /* ============================
     Group by Page Toggle
     ============================ */

  .sp-group-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: var(--sp-glass-bg-heavy);
    color: var(--sp-text-secondary);
    font-family: var(--sp-font);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .sp-group-toggle svg {
    width: 13px;
    height: 13px;
    flex-shrink: 0;
  }

  .sp-group-toggle:hover {
    border-color: var(--sp-accent);
    color: var(--sp-accent);
    background: var(--sp-accent-light);
  }

  .sp-group-toggle--active {
    background: var(--sp-accent-gradient);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 2px 8px var(--sp-accent-glow);
  }

  .sp-group-toggle--active:hover {
    background: var(--sp-accent-gradient);
    border-color: transparent;
    color: #fff;
  }

  /* ============================
     Page Group Header
     ============================ */

  .sp-group-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--sp-accent-light);
    border-bottom: 1px solid var(--sp-border);
    cursor: pointer;
    user-select: none;
    position: sticky;
    top: 0;
    z-index: 2;
    transition: background 0.2s ease;
  }

  .sp-group-header:hover {
    background: var(--sp-bg-hover);
  }

  .sp-group-header:focus-visible {
    outline: 2px solid var(--sp-accent);
    outline-offset: -2px;
  }

  .sp-group-header-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transition: transform 0.2s ease;
    transform: rotate(90deg);
  }

  .sp-group-header-chevron svg {
    width: 12px;
    height: 12px;
    color: var(--sp-text-tertiary);
  }

  .sp-group-header--collapsed .sp-group-header-chevron {
    transform: rotate(0deg);
  }

  .sp-group-header-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .sp-group-header-icon svg {
    width: 14px;
    height: 14px;
    color: var(--sp-text-tertiary);
  }

  .sp-group-header-path {
    font-size: 12px;
    font-weight: 600;
    color: var(--sp-text-secondary);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sp-group-header-count {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 8px;
    border-radius: var(--sp-radius-full);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* ============================
     Page Group Content
     ============================ */

  .sp-group-content {
    overflow: hidden;
    transition: max-height 0.25s ease, opacity 0.2s ease;
    max-height: 5000px;
    opacity: 1;
  }

  .sp-group-content--collapsed {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
  }

  /* ============================
     Forced Colors / High Contrast
     ============================ */

  @media (forced-colors: active) {
    .sp-sort-btn,
    .sp-group-toggle,
    .sp-sort-option,
    .sp-group-header {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
      color: ButtonText !important;
    }

    .sp-sort-btn:focus-visible,
    .sp-group-toggle:focus-visible,
    .sp-sort-option:focus-visible,
    .sp-group-header:focus-visible {
      outline: 3px solid Highlight !important;
    }

    .sp-sort-menu {
      border: 2px solid ButtonText !important;
      background: Canvas !important;
    }
  }

  /* ============================
     Reduced Motion
     ============================ */

  @media (prefers-reduced-motion: reduce) {
    .sp-sort-menu {
      animation: none;
    }
    .sp-group-header-chevron {
      transition: none;
    }
    .sp-group-content {
      transition: none;
    }
  }
`;var un={"stats.open":"Open","stats.resolved":"Resolved","stats.bugs":"Bugs","stats.progress":"{percent}% resolved"},hn={"stats.open":"Ouverts","stats.resolved":"R\xE9solus","stats.bugs":"Bugs","stats.progress":"{percent}% r\xE9solus"},rs=`
  .sp-stats-bar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 24px;
    border-bottom: 1px solid var(--sp-border);
    user-select: none;
  }

  .sp-stats-bar[hidden] {
    display: none;
  }

  .sp-stats-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .sp-stats-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .sp-stats-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .sp-stats-value {
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    color: var(--sp-text);
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    transition: opacity 0.3s ease;
  }

  .sp-stats-label {
    font-size: 11px;
    line-height: 1;
    color: var(--sp-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sp-stats-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sp-stats-progress-track {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: var(--sp-border);
    overflow: hidden;
  }

  .sp-stats-progress-fill {
    height: 100%;
    border-radius: 2px;
    background: linear-gradient(90deg, var(--sp-accent), #22c55e);
    width: 0%;
    transition: width 0.5s ease;
  }

  .sp-stats-progress-label {
    font-size: 10px;
    line-height: 1;
    color: var(--sp-text-tertiary);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    min-width: 64px;
    text-align: right;
  }
`,ke=class{constructor(e,t){this.colors=e;this.i18n=t==="fr"?hn:un,this.element=p("div",{class:"sp-stats-bar"}),this.element.setAttribute("aria-label","Feedback statistics"),this.element.hidden=!0;let s=p("div",{class:"sp-stats-row"}),o=p("div",{class:"sp-stats-item"}),i=p("span",{class:"sp-stats-dot"});i.style.background="#22c55e",this.valueOpen=p("span",{class:"sp-stats-value"}),h(this.valueOpen,"0");let r=p("span",{class:"sp-stats-label"});h(r,this.i18n["stats.open"]),o.appendChild(i),o.appendChild(this.valueOpen),o.appendChild(r);let a=p("div",{class:"sp-stats-item"}),l=p("span",{class:"sp-stats-dot"});l.style.background="#9ca3af",this.valueResolved=p("span",{class:"sp-stats-value"}),h(this.valueResolved,"0");let c=p("span",{class:"sp-stats-label"});h(c,this.i18n["stats.resolved"]),a.appendChild(l),a.appendChild(this.valueResolved),a.appendChild(c);let d=p("div",{class:"sp-stats-item"}),u=p("span",{class:"sp-stats-dot"});u.style.background=this.colors.typeBug,this.valueBugs=p("span",{class:"sp-stats-value"}),h(this.valueBugs,"0");let b=p("span",{class:"sp-stats-label"});h(b,this.i18n["stats.bugs"]),d.appendChild(u),d.appendChild(this.valueBugs),d.appendChild(b),s.appendChild(o),s.appendChild(a),s.appendChild(d);let f=p("div",{class:"sp-stats-progress"}),x=p("div",{class:"sp-stats-progress-track"});this.progressFill=p("div",{class:"sp-stats-progress-fill"}),x.appendChild(this.progressFill),this.progressLabel=p("span",{class:"sp-stats-progress-label"}),h(this.progressLabel,""),f.appendChild(x),f.appendChild(this.progressLabel),this.element.appendChild(s),this.element.appendChild(f)}colors;element;valueOpen;valueResolved;valueBugs;progressFill;progressLabel;i18n;update(e,t){if(t===0){this.element.hidden=!0;return}this.element.hidden=!1;let s=0,o=0,i=0;for(let c of e)c.status==="open"&&s++,c.status==="resolved"&&o++,c.type==="bug"&&i++;h(this.valueOpen,String(s)),h(this.valueResolved,String(o)),h(this.valueBugs,String(i));let r=e.length,a=r>0?Math.round(o/r*100):0;requestAnimationFrame(()=>{this.progressFill.style.width=`${a}%`});let l=this.i18n["stats.progress"].replace("{percent}",String(a));h(this.progressLabel,l)}};var bn='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01"/><path d="M10 8h.01"/><path d="M14 8h.01"/><path d="M18 8h.01"/><path d="M6 12h.01"/><path d="M18 12h.01"/><path d="M8 16h8"/></svg>',We={"shortcuts.title":"Keyboard shortcuts","shortcuts.navigate":"Navigate feedbacks","shortcuts.resolve":"Resolve / Reopen","shortcuts.delete":"Delete","shortcuts.search":"Focus search","shortcuts.select":"Toggle selection","shortcuts.help":"Show shortcuts","shortcuts.close":"Close","shortcuts.hint":"Keyboard shortcuts"},as={"shortcuts.title":"Raccourcis clavier","shortcuts.navigate":"Naviguer les feedbacks","shortcuts.resolve":"R\xE9soudre / Rouvrir","shortcuts.delete":"Supprimer","shortcuts.search":"Rechercher","shortcuts.select":"S\xE9lectionner","shortcuts.help":"Raccourcis","shortcuts.close":"Fermer","shortcuts.hint":"Raccourcis clavier"};function Xe(n){let e=n.querySelectorAll(".sp-card");for(let t=0;t<e.length;t++)if(e[t]?.classList.contains("sp-card--focused"))return t;return-1}function ls(n,e){let t=n.querySelectorAll(".sp-card");if(t.length===0)return;for(let i of t)i.classList.remove("sp-card--focused");let s=Math.max(0,Math.min(e,t.length-1)),o=t[s];o&&(o.classList.add("sp-card--focused"),o.scrollIntoView({block:"nearest",behavior:"smooth"}),o.focus({preventScroll:!0}))}var gn=[{keys:["J","K"],label:"shortcuts.navigate"},{keys:["R"],label:"shortcuts.resolve"},{keys:["D"],label:"shortcuts.delete"},{keys:["F","/"],label:"shortcuts.search"},{keys:["X"],label:"shortcuts.select"},{keys:["?"],label:"shortcuts.help"},{keys:["Esc"],label:"shortcuts.close"}],ps=`
  /* ---- Help overlay backdrop ---- */

  .sp-shortcuts-overlay {
    position: fixed;
    inset: 0;
    background: var(--sp-backdrop, rgba(15, 23, 42, 0.2));
    backdrop-filter: blur(var(--sp-blur));
    -webkit-backdrop-filter: blur(var(--sp-blur));
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .sp-shortcuts-overlay--visible {
    opacity: 1;
    pointer-events: auto;
  }

  /* ---- Glassmorphism card ---- */

  .sp-shortcuts-card {
    width: 380px;
    max-width: calc(100vw - 32px);
    padding: 24px 28px 20px;
    border-radius: 20px;
    background: var(--sp-glass-bg-heavy);
    backdrop-filter: blur(var(--sp-blur-heavy));
    -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-xl);
    font-family: var(--sp-font);
    position: relative;
    transform: scale(0.92) translateY(8px);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .sp-shortcuts-overlay--visible .sp-shortcuts-card {
    transform: scale(1) translateY(0);
  }

  /* ---- Title row ---- */

  .sp-shortcuts-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 700;
    color: var(--sp-text);
    margin-bottom: 18px;
  }

  .sp-shortcuts-title svg {
    width: 18px;
    height: 18px;
    color: var(--sp-text-secondary);
    flex-shrink: 0;
  }

  /* ---- Close button ---- */

  .sp-shortcuts-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--sp-text-tertiary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease;
  }

  .sp-shortcuts-close:hover {
    background: var(--sp-bg-hover);
    color: var(--sp-text);
  }

  .sp-shortcuts-close svg {
    width: 14px;
    height: 14px;
  }

  /* ---- Two-column grid ---- */

  .sp-shortcuts-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sp-shortcuts-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sp-shortcuts-keys {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 80px;
    justify-content: flex-end;
  }

  .sp-shortcuts-separator {
    font-size: 11px;
    color: var(--sp-text-tertiary);
    user-select: none;
  }

  /* ---- Key badge (<kbd> styling) ---- */

  .sp-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 28px;
    height: 26px;
    padding: 0 7px;
    border-radius: 6px;
    background: var(--sp-bg-hover);
    border: 1px solid var(--sp-border);
    box-shadow:
      inset 0 -1px 0 rgba(0, 0, 0, 0.08),
      0 1px 2px rgba(0, 0, 0, 0.04);
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--sp-text);
    text-align: center;
    line-height: 1;
    user-select: none;
  }

  /* ---- Description text ---- */

  .sp-shortcuts-desc {
    font-size: 13px;
    color: var(--sp-text-secondary);
    line-height: 1.3;
  }

  /* ---- Hint button (bottom-right of panel) ---- */

  .sp-shortcuts-hint {
    width: 24px;
    height: 24px;
    border-radius: var(--sp-radius-full);
    border: 1px solid var(--sp-border);
    background: var(--sp-bg-hover);
    color: var(--sp-text-tertiary);
    font-family: ui-monospace, "SF Mono", "Cascadia Code", "Segoe UI Mono", Menlo, monospace;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    position: absolute;
    bottom: 12px;
    right: 12px;
  }

  .sp-shortcuts-hint:hover {
    background: var(--sp-accent-light);
    color: var(--sp-accent);
    border-color: var(--sp-accent);
  }

  .sp-shortcuts-hint::after {
    content: attr(aria-label);
    position: absolute;
    bottom: calc(100% + 6px);
    right: 0;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--sp-glass-bg-heavy);
    border: 1px solid var(--sp-glass-border);
    box-shadow: var(--sp-shadow-sm);
    font-family: var(--sp-font);
    font-size: 11px;
    font-weight: 500;
    color: var(--sp-text-secondary);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .sp-shortcuts-hint:hover::after {
    opacity: 1;
    transform: translateY(0);
  }

  /* ---- Card focus highlight (navigation) ---- */

  .sp-card--focused {
    outline: 2px solid var(--sp-accent);
    outline-offset: -2px;
    border-radius: inherit;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    .sp-shortcuts-overlay,
    .sp-shortcuts-card,
    .sp-shortcuts-close,
    .sp-shortcuts-hint,
    .sp-shortcuts-hint::after {
      transition-duration: 0.01ms !important;
    }
  }
`,mn='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',we=class{constructor(e,t,s=We){this.i18n=s;this.keyMap=new Map([["j",()=>t.onNavigate("down")],["k",()=>t.onNavigate("up")],["r",()=>t.onResolve()],["d",()=>t.onDelete()],["f",()=>t.onFocusSearch()],["/",()=>t.onFocusSearch()],["x",()=>t.onToggleSelect()],["?",()=>this.toggleHelp()]]),this.helpOverlay=this.buildOverlay(),this.hintButton=this.buildHintButton(),this.boundHandler=o=>this.handleKeydown(o)}i18n;helpOverlay;hintButton;keyMap;boundHandler;shadowRoot=null;enabled=!1;helpVisible=!1;destroyed=!1;enable(e){if(this.destroyed||this.enabled)return;e&&(this.shadowRoot=e),(this.shadowRoot??document).addEventListener("keydown",this.boundHandler),this.enabled=!0}disable(){if(!this.enabled)return;(this.shadowRoot??document).removeEventListener("keydown",this.boundHandler),this.enabled=!1,this.helpVisible&&this.hideHelp()}toggleHelp(){this.helpVisible?this.hideHelp():this.showHelp()}destroy(){this.destroyed||(this.disable(),this.helpOverlay.remove(),this.hintButton.remove(),this.destroyed=!0)}handleKeydown(e){if(e.key==="Escape"){this.helpVisible&&(e.preventDefault(),e.stopPropagation(),this.hideHelp());return}if(this.helpVisible)return;let t=e.composedPath()[0];if(t){let o=t.tagName?.toLowerCase();if(o==="input"||o==="textarea"||o==="select"||t.isContentEditable)return}if(e.ctrlKey||e.altKey||e.metaKey)return;let s=this.keyMap.get(e.key);s&&(e.preventDefault(),e.stopPropagation(),s())}showHelp(){this.helpVisible=!0,this.helpOverlay.classList.add("sp-shortcuts-overlay--visible"),this.helpOverlay.querySelector(".sp-shortcuts-close")?.focus()}hideHelp(){this.helpVisible=!1,this.helpOverlay.classList.remove("sp-shortcuts-overlay--visible")}buildOverlay(){let e=p("div",{class:"sp-shortcuts-overlay"});e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label",this.i18n["shortcuts.title"]),e.addEventListener("click",a=>{a.target===e&&this.hideHelp()});let t=p("div",{class:"sp-shortcuts-card"}),s=p("div",{class:"sp-shortcuts-title"});s.appendChild(y(bn));let o=p("span");h(o,this.i18n["shortcuts.title"]),s.appendChild(o),t.appendChild(s);let i=document.createElement("button");i.className="sp-shortcuts-close",i.setAttribute("aria-label",this.i18n["shortcuts.close"]),i.appendChild(y(mn)),i.addEventListener("click",()=>this.hideHelp()),t.appendChild(i);let r=p("div",{class:"sp-shortcuts-grid"});for(let a of gn){let l=p("div",{class:"sp-shortcuts-row"}),c=p("div",{class:"sp-shortcuts-keys"});a.keys.forEach((u,b)=>{if(b>0){let x=p("span",{class:"sp-shortcuts-separator"});h(x,"/"),c.appendChild(x)}let f=p("span",{class:"sp-kbd"});h(f,u),c.appendChild(f)});let d=p("span",{class:"sp-shortcuts-desc"});h(d,this.i18n[a.label]),l.appendChild(c),l.appendChild(d),r.appendChild(l)}return t.appendChild(r),e.appendChild(t),e}buildHintButton(){let e=document.createElement("button");return e.className="sp-shortcuts-hint",e.setAttribute("aria-label",this.i18n["shortcuts.hint"]),h(e,"?"),e.addEventListener("click",t=>{t.stopPropagation(),this.toggleHelp()}),e}};var Ce=class{constructor(e,t,s,o,i,r,a,l,c){this.colors=t;this.bus=s;this.client=o;this.projectName=i;this.markers=r;this.t=a;this.locale=l;this.shadowRoot=e,this.bulkI18n=l==="fr"?Ke:ze,this.getScope=c?.getScope??(()=>({url:window.location.pathname,urlPattern:null})),this.scopeAnnotationsByUrl=c?.scopeAnnotationsByUrl??!0,this.root=p("div",{class:"sp-panel"}),this.root.setAttribute("role","complementary"),this.root.setAttribute("aria-label",this.t("panel.ariaLabel")),this.root.setAttribute("aria-hidden","true");let d=p("div",{class:"sp-panel-header"}),u=p("span",{class:"sp-panel-title"});h(u,this.t("panel.title")),this.closeBtn=document.createElement("button"),this.closeBtn.className="sp-panel-close",this.closeBtn.setAttribute("aria-label",this.t("panel.close")),this.closeBtn.appendChild(y(te)),this.closeBtn.addEventListener("click",()=>this.close()),this.deleteAllBtn=document.createElement("button"),this.deleteAllBtn.className="sp-btn-delete-all",this.deleteAllBtn.setAttribute("aria-label",this.t("panel.deleteAll")),this.deleteAllBtn.appendChild(y(Ne));let b=document.createElement("span");h(b,` ${this.t("panel.deleteAll")}`),this.deleteAllBtn.appendChild(b),this.deleteAllBtn.addEventListener("click",()=>this.confirmDeleteAll()),this.exportBtn=new me(t,()=>this.feedbacks),l==="fr"&&this.exportBtn.setLabels(qt);let f=p("div",{class:"sp-panel-header-right"});f.appendChild(this.exportBtn.element),f.appendChild(this.deleteAllBtn),f.appendChild(this.closeBtn),d.appendChild(u),d.appendChild(f),this.stats=new ke(t,l);let x=p("div",{class:"sp-filters"}),w=p("div",{class:"sp-search-wrap"}),C=y(mt);C.setAttribute("class","sp-search-icon"),this.searchInput=document.createElement("input"),this.searchInput.type="text",this.searchInput.className="sp-search",this.searchInput.placeholder=this.t("panel.search"),this.searchInput.setAttribute("aria-label",this.t("panel.searchAria")),this.searchInput.addEventListener("input",()=>{this.searchTimeout&&clearTimeout(this.searchTimeout),this.searchTimeout=setTimeout(()=>this.loadFeedbacks().catch(()=>{}),200)}),w.appendChild(C),w.appendChild(this.searchInput);let E=p("div",{class:"sp-filter-bar"});E.appendChild(this.buildTypeDropdown()),E.appendChild(this.buildStatusSegmented()),E.appendChild(this.buildScopeSegmented()),this.sortControls=new xe(t,()=>this.renderList(),l),x.appendChild(w),x.appendChild(E),x.appendChild(this.sortControls.element),this.listContainer=p("div",{class:"sp-list"}),this.listContainer.setAttribute("role","list"),this.listContainer.setAttribute("aria-label",this.t("panel.feedbackList")),this.bulk=new ve(t,{onResolve:m=>this.bulkResolve(m),onDelete:m=>this.bulkDelete(m)},l),this.bulk.setListContainer(this.listContainer),this.detail=new ye(t,{onBack:()=>this.detail.hide(),onResolve:async m=>{let v=m.status!=="resolved";await this.client.resolveFeedback(m.id,v),await this.loadFeedbacks(),this.detail.hide()},onDelete:async m=>{await this.client.deleteFeedback(m.id),this.bus.emit("feedback:deleted",m.id),await this.loadFeedbacks(),this.detail.hide()},onGoToAnnotation:m=>{if(m.annotations.length>0){let v=m.annotations[0];if(!v)return;window.scrollTo({left:v.scrollX,top:v.scrollY,behavior:"smooth"}),this.markers.pinHighlight(m)}}},l);let B=l==="fr"?as:We;this.shortcuts=new we(t,{onNavigate:m=>{let v=Xe(this.listContainer);ls(this.listContainer,m==="down"?v+1:v-1)},onResolve:()=>{let m=this.getFocusedFeedback();if(m&&!this.pendingMutations.has(m.id)){let k=this.listContainer.querySelector(`[data-feedback-id="${CSS.escape(m.id)}"]`)?.querySelector('[data-action="resolve"]');k&&this.toggleResolve(m,k).catch(()=>{})}},onDelete:()=>{let m=this.getFocusedFeedback();if(m&&!this.pendingMutations.has(m.id)){let k=this.listContainer.querySelector(`[data-feedback-id="${CSS.escape(m.id)}"]`)?.querySelector('[data-action="delete"]');k&&this.deleteFeedback(m,k).catch(()=>{})}},onFocusSearch:()=>this.searchInput.focus(),onToggleSelect:()=>{let m=this.getFocusedFeedback();m&&this.bulk.toggle(m.id)}},B),this.root.appendChild(d),this.root.appendChild(this.stats.element),this.root.appendChild(x),this.root.appendChild(this.listContainer),this.root.appendChild(this.bulk.barElement),this.root.appendChild(this.detail.element),this.root.appendChild(this.shortcuts.helpOverlay),this.root.appendChild(this.shortcuts.hintButton),e.appendChild(this.root),this.onListClick=m=>{let v=m.target;if(v.closest(".sp-bulk-checkbox"))return;let k=v.closest("[data-action]");if(k){m.stopPropagation();let T=k.closest(".sp-card");if(!T)return;let A=T.dataset.feedbackId,g=this.feedbacks.find(L=>L.id===A);if(!g)return;let M=k.dataset.action;if(M==="expand"){let L=T.querySelector(".sp-card-message");if(!L)return;let N=L.classList.toggle("sp-card-message--expanded");h(k,N?this.t("panel.showLess"):this.t("panel.showMore")),k.setAttribute("aria-expanded",String(N))}else if(M==="resolve"){if(this.pendingMutations.has(g.id))return;let L=k;this.toggleResolve(g,L).catch(()=>{})}else if(M==="delete"){if(this.pendingMutations.has(g.id))return;let L=k;this.deleteFeedback(g,L).catch(()=>{})}return}let S=v.closest(".sp-card");if(S){let T=S.dataset.feedbackId,A=this.feedbacks.find(g=>g.id===T);if(A){let g=this.feedbacks.indexOf(A)+1;this.detail.show(A,g)}}},this.listContainer.addEventListener("click",this.onListClick),this.onListKeydown=m=>{let v=m;if(v.key!=="Enter"&&v.key!==" ")return;let k=v.target,S=k.closest(".sp-card");if(!S||k!==S)return;v.preventDefault();let T=S.dataset.feedbackId,A=this.feedbacks.find(g=>g.id===T);if(A){let g=this.feedbacks.indexOf(A)+1;this.detail.show(A,g)}},this.listContainer.addEventListener("keydown",this.onListKeydown),this.onListMouseover=m=>{let k=m.target.closest(".sp-card");if(!k)return;let S=k.dataset.feedbackId;S&&this.markers.highlight(S)},this.listContainer.addEventListener("mouseover",this.onListMouseover),this.onListMouseout=m=>{let v=m.relatedTarget;v&&this.listContainer.contains(v)||this.markers.highlight("")},this.listContainer.addEventListener("mouseout",this.onListMouseout),this.bus.on("panel:toggle",m=>{m?this.open():this.close()}),e.addEventListener("keydown",m=>{let v=m;if(v.key==="Escape"&&this.isOpen){if(this.detail.isVisible){this.detail.hide();return}this.close();return}if(v.key==="Tab"&&this.isOpen){let k=this.root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');if(k.length===0)return;let S=k[0],T=k[k.length-1];if(!S||!T)return;let A=e.activeElement;v.shiftKey&&A===S?(v.preventDefault(),T.focus()):!v.shiftKey&&A===T&&(v.preventDefault(),S.focus())}}),this.onMarkerClick=(m=>{this.scrollToFeedback(m.detail.feedbackId)}),document.addEventListener("sp-marker-click",this.onMarkerClick)}colors;bus;client;projectName;markers;t;locale;root;listContainer;searchInput;closeBtn;deleteAllBtn;activeFilters=new Set(["all"]);activeStatusFilter="all";typeDropdownBtn;typeDropdownContainer;typeDropdownMenu=null;typeDropdownOutsideHandler=null;statusSegmented;typeOptions;statusOptions;feedbacks=[];currentPage=1;totalFeedbacks=0;isLoadingMore=!1;isOpen=!1;searchTimeout=null;loadController=null;pendingMutations=new Set;stats;sortControls;bulk;exportBtn;shortcuts;detail;shadowRoot;bulkI18n;getScope;scopeAnnotationsByUrl;activeScopeFilter="this";scopeSegmented;scopeOptions;onMarkerClick;onListClick;onListKeydown;onListMouseover;onListMouseout;async open(){this.isOpen||(this.isOpen=!0,this.root.classList.add("sp-panel--open"),this.root.setAttribute("aria-hidden","false"),this.bus.emit("open"),this.shortcuts.enable(this.shadowRoot),await this.loadFeedbacks(),requestAnimationFrame(()=>{this.searchInput?this.searchInput.focus():this.closeBtn.focus()}))}close(){if(!this.isOpen)return;this.isOpen=!1,this.root.classList.remove("sp-panel--open"),this.root.setAttribute("aria-hidden","true"),this.bus.emit("close"),this.shortcuts.disable(),this.detail.hide(),this.root.getRootNode().querySelector(".sp-fab")?.focus()}showLoading(){this.listContainer.replaceChildren();let e=p("div",{class:"sp-loading"});e.setAttribute("role","status"),e.setAttribute("aria-live","polite"),e.setAttribute("aria-label",this.t("panel.loading"));let t=p("div",{class:"sp-spinner"});e.appendChild(t),this.listContainer.appendChild(e)}showError(){this.listContainer.replaceChildren();let e=p("div",{class:"sp-empty"});e.setAttribute("role","status"),e.setAttribute("aria-live","polite");let t=p("div",{class:"sp-empty-text"});h(t,this.t("panel.loadError"));let s=document.createElement("button");s.className="sp-btn-ghost",s.style.marginTop="8px",h(s,this.t("panel.retry")),s.addEventListener("click",()=>this.loadFeedbacks().catch(()=>{})),e.appendChild(t),e.appendChild(s),this.listContainer.appendChild(e)}async loadFeedbacks(){this.loadController?.abort(),this.loadController=new AbortController;let{signal:e}=this.loadController;this.currentPage=1;let t=this.searchInput.value.trim()||void 0,s=this.activeFilters.has("all")?void 0:Array.from(this.activeFilters)[0],o=this.activeStatusFilter==="all"?void 0:this.activeStatusFilter,i=this.getScope();this.syncScopeAvailability();let r={page:1,limit:20};s&&(r.type=s),o&&(r.status=o),t&&(r.search=t),this.activeScopeFilter==="this"?r.url=i.url:this.activeScopeFilter==="template"&&i.urlPattern&&(r.urlPattern=i.urlPattern);let a=this.feedbacks.length>0;a||this.showLoading();try{let{feedbacks:l,total:c}=await this.client.getFeedbacks(this.projectName,r);if(e.aborted)return;this.feedbacks=l,this.totalFeedbacks=c,this.stats.update(l,c),this.bulk.reset(),this.renderList();let d=this.scopeAnnotationsByUrl?l.filter(u=>u.url===i.url):l;this.markers.render(d)}catch(l){if(e.aborted)return;a||this.showError(),this.bus.emit("feedback:error",l instanceof Error?l:new Error(String(l)))}}async loadMoreFeedbacks(){if(this.isLoadingMore)return;this.isLoadingMore=!0;let e=this.loadController,t=this.currentPage+1,s=this.searchInput.value.trim()||void 0,o=this.activeFilters.has("all")?void 0:Array.from(this.activeFilters)[0],i=this.activeStatusFilter==="all"?void 0:this.activeStatusFilter,r=this.getScope(),a={page:t,limit:20};o&&(a.type=o),i&&(a.status=i),s&&(a.search=s),this.activeScopeFilter==="this"?a.url=r.url:this.activeScopeFilter==="template"&&r.urlPattern&&(a.urlPattern=r.urlPattern);let l=this.listContainer.querySelector(".sp-btn-load-more"),c;l&&(c=this.setButtonLoading(l));try{let{feedbacks:d,total:u}=await this.client.getFeedbacks(this.projectName,a);if(e!==this.loadController)return;this.currentPage=t,this.totalFeedbacks=u,this.feedbacks=[...this.feedbacks,...d],this.stats.update(this.feedbacks,u),this.renderList();let b=this.scopeAnnotationsByUrl?this.feedbacks.filter(f=>f.url===r.url):this.feedbacks;this.markers.render(b)}catch(d){c&&c(),this.bus.emit("feedback:error",d instanceof Error?d:new Error(String(d)))}finally{this.isLoadingMore=!1}}renderList(){if(this.listContainer.replaceChildren(),this.feedbacks.length===0){let i=p("div",{class:"sp-empty"});i.setAttribute("role","status"),i.setAttribute("aria-live","polite");let r=p("div",{class:"sp-empty-text"});h(r,this.t("panel.empty")),i.appendChild(r),this.listContainer.appendChild(i);return}let e=ss(this.feedbacks,this.sortControls.sortMode),t=e.map(i=>i.id),s=this.bulk.createSelectAllBar(t,this.bulkI18n["bulk.selectAll"]);if(this.listContainer.appendChild(s),this.sortControls.groupByPage){let i=ns(e),r=0;for(let[a,l]of i){let c=os(a,l.length,this.colors);this.listContainer.appendChild(c);let d=p("div",{class:"sp-group-content"});for(let u of l){let b=this.createCard(u,r+1);b.style.setProperty("--sp-card-i",String(r)),d.appendChild(b),r++}this.listContainer.appendChild(d)}}else e.forEach((i,r)=>{let a=this.createCard(i,r+1);a.style.setProperty("--sp-card-i",String(r)),this.listContainer.appendChild(a)});let o=this.totalFeedbacks-this.feedbacks.length;if(o>0){let i=p("div",{class:"sp-load-more-wrap"}),r=document.createElement("button");r.className="sp-btn-ghost sp-btn-load-more",h(r,this.t("panel.loadMore").replace("{remaining}",String(o))),r.addEventListener("click",()=>this.loadMoreFeedbacks().catch(()=>{})),i.appendChild(r),this.listContainer.appendChild(i)}}createCard(e,t){let s=e.status==="resolved",o=F(e.type,this.colors),i=p("div",{class:`sp-card ${s?"sp-card--resolved":""}`});i.setAttribute("role","listitem"),i.setAttribute("tabindex","0"),i.setAttribute("aria-label",`Feedback #${t}: ${O(e.type,this.t)} \u2014 ${e.message.slice(0,80)}`),i.dataset.feedbackId=e.id;let r=p("div",{class:"sp-card-bar"});r.style.background=s?"#9ca3af":o;let a=p("div",{class:"sp-card-body"}),l=p("div",{class:"sp-card-header"}),c=this.bulk.createCheckbox(e.id);l.appendChild(c);let d=p("span",{class:"sp-card-number"});h(d,`#${t}`);let u=p("span",{class:"sp-badge"}),b=P(e.type,this.colors);u.style.background=b,u.style.color=o,h(u,O(e.type,this.t));let f=p("span",{class:"sp-card-date"});h(f,ee(e.createdAt,this.locale)),l.appendChild(d),l.appendChild(u),l.appendChild(f);let x=p("div",{class:"sp-card-message"});h(x,e.message);let w=document.createElement("button");w.className="sp-card-expand",w.dataset.action="expand",h(w,this.t("panel.showMore")),w.style.display="none",w.setAttribute("aria-expanded","false"),requestAnimationFrame(()=>{x.scrollHeight>x.clientHeight&&(w.style.display="block")});let C=p("div",{class:"sp-card-footer"}),E=document.createElement("button");if(E.className="sp-btn-resolve",E.dataset.action="resolve",s){E.appendChild(y(yt));let v=document.createElement("span");h(v,` ${this.t("panel.reopen")}`),E.appendChild(v)}else{E.appendChild(y(se));let v=document.createElement("span");h(v,` ${this.t("panel.resolve")}`),E.appendChild(v)}let B=document.createElement("button");B.className="sp-btn-delete",B.dataset.action="delete",B.appendChild(y(Ne));let m=document.createElement("span");return h(m,` ${this.t("panel.delete")}`),B.appendChild(m),C.appendChild(E),C.appendChild(B),a.appendChild(l),a.appendChild(x),a.appendChild(w),a.appendChild(C),i.appendChild(r),i.appendChild(a),i}async bulkResolve(e){try{await Promise.all(e.map(t=>this.client.resolveFeedback(t,!0))),await this.loadFeedbacks()}catch(t){throw this.bus.emit("feedback:error",t instanceof Error?t:new Error(String(t))),t}}async bulkDelete(e){try{await Promise.all(e.map(t=>this.client.deleteFeedback(t)));for(let t of e)this.bus.emit("feedback:deleted",t);await this.loadFeedbacks()}catch(t){throw this.bus.emit("feedback:error",t instanceof Error?t:new Error(String(t))),t}}async confirmDeleteAll(){if(await this.showConfirmDialog(this.t("panel.deleteAllConfirmTitle"),this.t("panel.deleteAllConfirmMessage"))){this.deleteAllBtn.disabled=!0;try{await this.client.deleteAllFeedbacks(this.projectName),this.bus.emit("feedback:all-deleted"),await this.loadFeedbacks()}catch(t){this.bus.emit("feedback:error",t instanceof Error?t:new Error(String(t)))}finally{this.deleteAllBtn.disabled=!1}}}showConfirmDialog(e,t){return new Promise(s=>{let o=p("div",{class:"sp-confirm-backdrop"}),i=`sp-confirm-title-${Date.now()}`,r=`sp-confirm-msg-${Date.now()}`,a=p("div",{class:"sp-confirm-dialog"});a.setAttribute("role","alertdialog"),a.setAttribute("aria-modal","true"),a.setAttribute("aria-labelledby",i),a.setAttribute("aria-describedby",r);let l=p("div",{class:"sp-confirm-title"});l.id=i,h(l,e);let c=p("div",{class:"sp-confirm-message"});c.id=r,h(c,t);let d=p("div",{class:"sp-confirm-actions"}),u=document.createElement("button");u.type="button",u.className="sp-btn-ghost",h(u,this.t("panel.cancel"));let b=document.createElement("button");b.type="button",b.className="sp-btn-danger",h(b,this.t("panel.confirmDelete"));let f=!1,x=C=>{f||(f=!0,o.removeEventListener("keydown",w),o.style.opacity="0",a.style.transform="translateY(8px) scale(0.97)",setTimeout(()=>{o.remove(),s(C)},200))},w=C=>{let E=C;if(E.key==="Escape"){x(!1);return}E.key==="Tab"&&(E.preventDefault(),o.getRootNode().activeElement===u?b.focus():u.focus())};o.addEventListener("keydown",w),u.addEventListener("click",()=>x(!1)),b.addEventListener("click",()=>x(!0)),o.addEventListener("click",C=>{C.target===o&&x(!1)}),d.appendChild(u),d.appendChild(b),a.appendChild(l),a.appendChild(c),a.appendChild(d),o.appendChild(a),this.root.getRootNode()instanceof ShadowRoot?this.root.getRootNode().appendChild(o):this.root.appendChild(o),requestAnimationFrame(()=>{o.style.opacity="1",a.style.transform="translateY(0) scale(1)",u.focus()})})}setButtonLoading(e){let t=Array.from(e.childNodes).map(s=>s.cloneNode(!0));return e.disabled=!0,e.replaceChildren(p("div",{class:"sp-spinner sp-spinner--sm"})),()=>{e.replaceChildren(...t),e.disabled=!1}}async deleteFeedback(e,t){this.pendingMutations.add(e.id);let s=this.setButtonLoading(t);try{await this.client.deleteFeedback(e.id),this.bus.emit("feedback:deleted",e.id),await this.loadFeedbacks()}catch(o){s(),this.bus.emit("feedback:error",o instanceof Error?o:new Error(String(o)))}finally{this.pendingMutations.delete(e.id)}}async toggleResolve(e,t){this.pendingMutations.add(e.id);let s=this.setButtonLoading(t);try{let o=e.status!=="resolved";await this.client.resolveFeedback(e.id,o),await this.loadFeedbacks()}catch(o){s(),this.bus.emit("feedback:error",o instanceof Error?o:new Error(String(o)))}finally{this.pendingMutations.delete(e.id)}}buildTypeDropdown(){return this.typeOptions=[{value:"all",label:this.t("panel.filterAll"),icon:Oe,color:this.colors.accent,bg:this.colors.accentLight},{value:"question",label:this.t("type.question"),icon:ne,color:this.colors.typeQuestion,bg:this.colors.typeQuestionBg},{value:"change",label:this.t("type.change"),icon:oe,color:this.colors.typeChange,bg:this.colors.typeChangeBg},{value:"bug",label:this.t("type.bug"),icon:ie,color:this.colors.typeBug,bg:this.colors.typeBugBg},{value:"other",label:this.t("type.other"),icon:re,color:this.colors.typeOther,bg:this.colors.typeOtherBg}],this.typeDropdownContainer=p("div",{class:"sp-filter-dropdown"}),this.typeDropdownBtn=document.createElement("button"),this.typeDropdownBtn.type="button",this.typeDropdownBtn.className="sp-filter-dropdown-btn",this.typeDropdownBtn.setAttribute("aria-haspopup","listbox"),this.typeDropdownBtn.setAttribute("aria-expanded","false"),this.renderTypeDropdownTrigger(),this.typeDropdownBtn.addEventListener("click",e=>{e.stopPropagation(),this.typeDropdownMenu?this.closeTypeDropdown():this.openTypeDropdown()}),this.typeDropdownContainer.appendChild(this.typeDropdownBtn),this.typeDropdownContainer}renderTypeDropdownTrigger(){let e=this.typeOptions.find(a=>this.activeFilters.has(a.value))??this.typeOptions[0];if(!e)return;this.typeDropdownBtn.replaceChildren(),this.typeDropdownBtn.style.setProperty("--sp-chip-color",e.color),this.typeDropdownBtn.style.setProperty("--sp-chip-bg",e.bg),this.typeDropdownBtn.dataset.filter=e.value,this.typeDropdownBtn.classList.toggle("sp-filter-dropdown-btn--filtered",e.value!=="all"),this.typeDropdownBtn.setAttribute("aria-label",`${this.t("type.label")}: ${e.label}`);let t=p("span",{class:"sp-filter-dropdown-btn__icon"});t.appendChild(y(e.icon)),this.typeDropdownBtn.appendChild(t);let s=p("span",{class:"sp-filter-dropdown-btn__label"}),o=p("span",{class:"sp-filter-dropdown-btn__prefix"});h(o,this.t("type.label"));let i=p("span",{class:"sp-filter-dropdown-btn__value"});h(i,e.label),s.appendChild(o),s.appendChild(i),this.typeDropdownBtn.appendChild(s);let r=p("span",{class:"sp-filter-dropdown-btn__chevron"});r.appendChild(y(vt)),this.typeDropdownBtn.appendChild(r)}openTypeDropdown(){this.typeDropdownMenu=p("div",{class:"sp-filter-dropdown-menu"}),this.typeDropdownMenu.setAttribute("role","listbox"),this.typeDropdownMenu.setAttribute("aria-label",this.t("type.label")),this.typeDropdownBtn.setAttribute("aria-expanded","true");for(let e of this.typeOptions){let t=document.createElement("button");t.type="button";let s=this.activeFilters.has(e.value);t.className=`sp-filter-dropdown-option${s?" sp-filter-dropdown-option--active":""}`,t.style.setProperty("--sp-chip-color",e.color),t.style.setProperty("--sp-chip-bg",e.bg),t.dataset.filter=e.value,t.setAttribute("role","option"),t.setAttribute("aria-selected",String(s));let o=p("span",{class:"sp-filter-dropdown-option__icon"});o.appendChild(y(e.icon)),t.appendChild(o);let i=p("span",{class:"sp-filter-dropdown-option__label"});if(h(i,e.label),t.appendChild(i),s){let r=p("span",{class:"sp-filter-dropdown-option__check"});r.appendChild(y(se)),t.appendChild(r)}t.addEventListener("click",r=>{r.stopPropagation(),this.selectTypeFilter(e.value)}),this.typeDropdownMenu.appendChild(t)}this.typeDropdownContainer.appendChild(this.typeDropdownMenu),requestAnimationFrame(()=>{this.typeDropdownOutsideHandler=e=>{this.typeDropdownMenu&&!this.typeDropdownContainer.contains(e.target)&&this.closeTypeDropdown()},document.addEventListener("click",this.typeDropdownOutsideHandler,!0)}),this.typeDropdownMenu.addEventListener("keydown",e=>{e.key==="Escape"&&(this.closeTypeDropdown(),this.typeDropdownBtn.focus())})}closeTypeDropdown(){this.typeDropdownMenu&&(this.typeDropdownMenu.remove(),this.typeDropdownMenu=null),this.typeDropdownBtn.setAttribute("aria-expanded","false"),this.typeDropdownOutsideHandler&&(document.removeEventListener("click",this.typeDropdownOutsideHandler,!0),this.typeDropdownOutsideHandler=null)}selectTypeFilter(e){this.activeFilters.clear(),this.activeFilters.add(e),this.renderTypeDropdownTrigger(),this.closeTypeDropdown(),this.loadFeedbacks().catch(()=>{})}buildStatusSegmented(){this.statusOptions=[{value:"all",label:this.t("panel.statusAll"),icon:Oe,color:this.colors.accent,bg:this.colors.accentLight},{value:"open",label:this.t("panel.statusOpen"),icon:ft,color:this.colors.statusOpen,bg:this.colors.statusOpenBg},{value:"resolved",label:this.t("panel.statusResolved"),icon:se,color:this.colors.statusResolved,bg:this.colors.statusResolvedBg}],this.statusSegmented=p("div",{class:"sp-segmented",role:"radiogroup"}),this.statusSegmented.setAttribute("aria-label",this.t("status.label"));for(let e of this.statusOptions){let t=document.createElement("button");t.type="button",t.className=`sp-segmented__btn sp-segmented__btn--${e.value}`,t.dataset.statusFilter=e.value,t.setAttribute("role","radio");let s=this.activeStatusFilter===e.value;t.setAttribute("aria-checked",String(s)),t.tabIndex=s?0:-1,s&&t.classList.add("sp-segmented__btn--active"),t.style.setProperty("--sp-chip-color",e.color),t.style.setProperty("--sp-chip-bg",e.bg);let o=p("span",{class:"sp-segmented__icon"});o.appendChild(y(e.icon)),t.appendChild(o);let i=p("span",{class:"sp-segmented__label"});h(i,e.label),t.appendChild(i),t.addEventListener("click",()=>this.selectStatusFilter(e.value)),t.addEventListener("keydown",r=>this.handleSegmentedKey(r,e.value)),this.statusSegmented.appendChild(t)}return this.statusSegmented}handleSegmentedKey(e,t){let s=this.statusOptions.map(l=>l.value),o=s.indexOf(t),i;switch(e.key){case"ArrowLeft":i=(o-1+s.length)%s.length;break;case"ArrowRight":i=(o+1)%s.length;break;case"Home":i=0;break;case"End":i=s.length-1;break;default:return}e.preventDefault();let r=s[i];if(!r)return;this.selectStatusFilter(r),this.statusSegmented.querySelector(`[data-status-filter="${r}"]`)?.focus()}selectStatusFilter(e){this.activeStatusFilter=e;let t=this.statusSegmented.querySelectorAll(".sp-segmented__btn");for(let s of t){let o=s.dataset.statusFilter===e;s.classList.toggle("sp-segmented__btn--active",o),s.setAttribute("aria-checked",String(o)),s.tabIndex=o?0:-1}this.loadFeedbacks().catch(()=>{})}buildScopeSegmented(){this.scopeOptions=[{value:"this",label:this.t("scope.thisPage")},{value:"template",label:this.t("scope.thisType")},{value:"all",label:this.t("scope.all")}],this.scopeSegmented=p("div",{class:"sp-segmented sp-segmented--scope",role:"radiogroup"}),this.scopeSegmented.setAttribute("aria-label",this.t("scope.label"));for(let e of this.scopeOptions){let t=document.createElement("button");t.type="button",t.className=`sp-segmented__btn sp-segmented__btn--scope-${e.value}`,t.dataset.scopeFilter=e.value,t.setAttribute("role","radio");let s=this.activeScopeFilter===e.value;t.setAttribute("aria-checked",String(s)),t.tabIndex=s?0:-1,s&&t.classList.add("sp-segmented__btn--active");let o=p("span",{class:"sp-segmented__label"});h(o,e.label),t.appendChild(o),t.addEventListener("click",()=>this.selectScopeFilter(e.value)),t.addEventListener("keydown",i=>this.handleScopeKey(i,e.value)),this.scopeSegmented.appendChild(t)}return this.syncScopeAvailability(),this.scopeSegmented}handleScopeKey(e,t){let s=this.scopeOptions.map(l=>l.value).filter(l=>{let c=this.scopeSegmented.querySelector(`[data-scope-filter="${l}"]`);return c&&c.style.display!=="none"}),o=s.indexOf(t);if(o<0)return;let i;switch(e.key){case"ArrowLeft":i=(o-1+s.length)%s.length;break;case"ArrowRight":i=(o+1)%s.length;break;case"Home":i=0;break;case"End":i=s.length-1;break;default:return}e.preventDefault();let r=s[i];if(!r)return;this.selectScopeFilter(r),this.scopeSegmented.querySelector(`[data-scope-filter="${r}"]`)?.focus()}selectScopeFilter(e){this.activeScopeFilter=e;let t=this.scopeSegmented.querySelectorAll(".sp-segmented__btn");for(let s of t){let o=s.dataset.scopeFilter===e;s.classList.toggle("sp-segmented__btn--active",o),s.setAttribute("aria-checked",String(o)),s.tabIndex=o?0:-1}this.loadFeedbacks().catch(()=>{})}syncScopeAvailability(){if(!this.scopeSegmented)return;let e=this.getScope(),t=this.scopeSegmented.querySelector('[data-scope-filter="template"]');if(!t)return;let s=!!e.urlPattern;t.style.display=s?"":"none",!s&&this.activeScopeFilter==="template"&&(this.activeScopeFilter="this",this.selectScopeFilter("this"))}getFocusedFeedback(){let e=Xe(this.listContainer);if(e<0)return;let t=this.listContainer.querySelectorAll(".sp-card")[e];if(t)return this.feedbacks.find(s=>s.id===t.dataset.feedbackId)}scrollToFeedback(e){let t=CSS.escape(e),s=this.listContainer.querySelector(`[data-feedback-id="${t}"]`);s&&(s.scrollIntoView({behavior:"smooth",block:"center"}),s.classList.add("sp-anim-flash"),s.addEventListener("animationend",()=>{s.classList.remove("sp-anim-flash")},{once:!0}))}async refresh(){this.isOpen&&await this.loadFeedbacks()}get isCurrentlyOpen(){return this.isOpen}destroy(){this.loadController?.abort(),this.searchTimeout&&clearTimeout(this.searchTimeout),this.listContainer.removeEventListener("click",this.onListClick),this.listContainer.removeEventListener("keydown",this.onListKeydown),this.listContainer.removeEventListener("mouseover",this.onListMouseover),this.listContainer.removeEventListener("mouseout",this.onListMouseout),document.removeEventListener("sp-marker-click",this.onMarkerClick),this.closeTypeDropdown(),this.sortControls.destroy(),this.bulk.destroy(),this.exportBtn.destroy(),this.shortcuts.destroy(),this.detail.destroy(),this.root.remove()}};function Ge(n){return{cssSelector:n.anchor.cssSelector,xpath:n.anchor.xpath,textSnippet:n.anchor.textSnippet,elementTag:n.anchor.elementTag,elementId:n.anchor.elementId,textPrefix:n.anchor.textPrefix,textSuffix:n.anchor.textSuffix,fingerprint:n.anchor.fingerprint,neighborText:n.anchor.neighborText,anchorKey:n.anchor.anchorKey??null,xPct:n.rect.xPct,yPct:n.rect.yPct,wPct:n.rect.wPct,hPct:n.rect.hPct,scrollX:n.scrollX,scrollY:n.scrollY,viewportW:n.viewportW,viewportH:n.viewportH,devicePixelRatio:n.devicePixelRatio}}var Ee=class{constructor(e,t){this.store=e;this.projectName=t}store;projectName;async sendFeedback(e){let t=await this.store.createFeedback({projectName:e.projectName,type:e.type,message:e.message,status:"open",url:e.url,urlPattern:e.urlPattern??null,viewport:e.viewport,userAgent:e.userAgent,authorName:e.authorName,authorEmail:e.authorEmail,clientId:e.clientId,annotations:e.annotations.map(Ge),screenshotDataUrl:e.screenshotDataUrl??null});return Ve(t)}async getFeedbacks(e,t){let{feedbacks:s,total:o}=await this.store.getFeedbacks({projectName:e,page:t?.page,limit:t?.limit,type:t?.type,status:t?.status,search:t?.search,url:t?.url,urlPattern:t?.urlPattern});return{feedbacks:s.map(Ve),total:o}}async resolveFeedback(e,t){let s=await this.store.updateFeedback(e,{status:t?"resolved":"open",resolvedAt:t?new Date:null});return Ve(s)}async deleteFeedback(e){await this.store.deleteFeedback(e)}async deleteAllFeedbacks(e){await this.store.deleteAllFeedbacks(e)}};function Ve(n){return{id:n.id,projectName:n.projectName,type:n.type,message:n.message,status:n.status,url:n.url,urlPattern:n.urlPattern??null,viewport:n.viewport,userAgent:n.userAgent,authorName:n.authorName,authorEmail:n.authorEmail,resolvedAt:n.resolvedAt?.toISOString()??null,createdAt:n.createdAt.toISOString(),updatedAt:n.updatedAt.toISOString(),annotations:n.annotations.map(fn),screenshotUrl:n.screenshotUrl??null}}function fn(n){return{id:n.id,feedbackId:n.feedbackId,cssSelector:n.cssSelector,xpath:n.xpath,textSnippet:n.textSnippet,elementTag:n.elementTag,elementId:n.elementId,textPrefix:n.textPrefix,textSuffix:n.textSuffix,fingerprint:n.fingerprint,neighborText:n.neighborText,anchorKey:n.anchorKey??null,xPct:n.xPct,yPct:n.yPct,wPct:n.wPct,hPct:n.hPct,scrollX:n.scrollX,scrollY:n.scrollY,viewportW:n.viewportW,viewportH:n.viewportH,devicePixelRatio:n.devicePixelRatio,createdAt:n.createdAt.toISOString()}}var vn="linear(0, 0.006, 0.025, 0.06, 0.11, 0.17, 0.25, 0.34, 0.45, 0.56, 0.67, 0.78, 0.88, 0.95, 1.01, 1.04, 1.05, 1.04, 1.02, 1, 0.99, 1)",Qe="cubic-bezier(0.16, 1, 0.3, 1)",Je="cubic-bezier(0.34, 1.56, 0.64, 1)",yn="cubic-bezier(0.25, 1, 0.5, 1)",cs=`
  /* ---- Keyframes ---- */

  @keyframes sp-fab-in {
    from {
      transform: scale(0) rotate(-180deg);
      opacity: 0;
    }
    to {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  @keyframes sp-fab-glow {
    0%, 100% { box-shadow: 0 4px 20px var(--sp-accent-glow), 0 2px 8px rgba(0, 0, 0, 0.08); }
    50% { box-shadow: 0 4px 28px var(--sp-accent-glow), 0 2px 12px rgba(0, 0, 0, 0.1); }
  }

  @keyframes sp-marker-in {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    60% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes sp-pulse-ring {
    0% {
      box-shadow: 0 0 0 0 var(--sp-accent-glow);
    }
    70% {
      box-shadow: 0 0 0 8px transparent;
    }
    100% {
      box-shadow: 0 0 0 0 transparent;
    }
  }

  @keyframes sp-flash-bg {
    0% { background-color: var(--sp-accent-light); }
    100% { background-color: transparent; }
  }

  @keyframes sp-slide-up {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes sp-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes sp-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* ---- Animation classes ---- */

  .sp-anim-fab-in {
    animation: sp-fab-in 0.5s ${vn} both;
  }

  .sp-anim-marker-in {
    animation: sp-marker-in 0.35s ${Je} both;
  }

  .sp-anim-pulse {
    animation: sp-pulse-ring 0.7s ease-out;
  }

  .sp-anim-flash {
    animation: sp-flash-bg 0.5s ${yn};
  }

  .sp-anim-slide-up {
    animation: sp-slide-up 0.3s ${Qe} both;
  }

  .sp-anim-fade-in {
    animation: sp-fade-in 0.2s ease-out both;
  }

  /* ---- Transition utilities ---- */

  .sp-panel {
    transform: translateX(110%);
    transition: transform 0.4s ${Qe};
  }

  .sp-panel.sp-panel--open {
    transform: translateX(0);
  }

  .sp-radial-item {
    opacity: 0;
    pointer-events: none;
    transform: translate(0, 0) scale(0.8);
    transition:
      transform 0.35s ${Je},
      opacity 0.2s ease,
      background 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .sp-radial-item.sp-radial-item--open {
    opacity: 1;
    pointer-events: auto;
  }

  /* Stagger delay via CSS custom property --sp-i */
  .sp-radial-item {
    transition-delay: calc(var(--sp-i, 0) * 50ms);
  }

  /* ---- Card stagger animation ---- */

  @keyframes sp-card-in {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .sp-card {
    animation: sp-card-in 0.35s ${Qe} both;
    animation-delay: calc(var(--sp-card-i, 0) * 40ms);
  }

  /* ---- Loading spinner ---- */

  @keyframes sp-spin {
    to { transform: rotate(360deg); }
  }

  .sp-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--sp-border);
    border-top-color: var(--sp-accent);
    border-radius: 50%;
    animation: sp-spin 0.6s linear infinite;
  }

  /* ---- Badge bounce ---- */

  @keyframes sp-badge-in {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .sp-fab-badge {
    animation: sp-badge-in 0.4s ${Je} both;
  }

  /* ---- Reduced motion ---- */

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

`;function Ze(n){return`
    :host {
      all: initial;
      position: fixed;
      z-index: ${2147483647};
      font-family: var(--sp-font);
      font-size: 14px;
      line-height: 1.5;
      color: var(--sp-text);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      ${Ct(n)}

      /* Identity modal \u2014 theme-aware backdrop + panel */
      --sp-identity-bg: ${n.glassBgHeavy};
      --sp-identity-overlay: ${n.bg==="#ffffff"?"rgba(15, 23, 42, 0.2)":"rgba(0, 0, 0, 0.4)"};
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ============================
       Focus visible (accessibility)
       ============================ */

    :focus-visible {
      outline: 2px solid var(--sp-accent);
      outline-offset: 2px;
    }

    /* ============================
       FAB (Floating Action Button)
       ============================ */

    .sp-fab {
      position: fixed;
      width: 52px;
      height: 52px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-accent-gradient);
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow:
        0 4px 20px var(--sp-accent-glow),
        0 2px 8px rgba(0, 0, 0, 0.08);
      transition:
        transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease;
      outline: none;
    }

    .sp-fab:focus-visible {
      outline: 2px solid #fff;
      outline-offset: 3px;
    }

    .sp-fab:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow:
        0 8px 28px var(--sp-accent-glow),
        0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .sp-fab:active {
      transform: translateY(0) scale(0.95);
      transition-duration: 0.1s;
    }

    .sp-fab--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-fab--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-fab svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    /* ---- FAB Badge ---- */

    .sp-fab-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--sp-radius-full);
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #fff;
      pointer-events: none;
      font-family: var(--sp-font);
      line-height: 1;
    }

    /* ============================
       Radial Menu
       ============================ */

    .sp-radial {
      position: fixed;
      pointer-events: none;
      width: 52px;
      height: 52px;
    }

    .sp-radial--bottom-right {
      bottom: 24px;
      right: 24px;
    }

    .sp-radial--bottom-left {
      bottom: 24px;
      left: 24px;
    }

    .sp-radial-item {
      position: absolute;
      left: 4px;
      bottom: 4px;
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius-full);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      color: var(--sp-text);
      border: 1px solid var(--sp-glass-border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--sp-shadow-md);
      font-size: 12px;
      font-weight: 600;
    }

    .sp-radial-item:hover,
    .sp-radial-item:focus-visible {
      background: rgba(255, 255, 255, 0.95);
      border-color: var(--sp-accent);
      color: var(--sp-accent);
      box-shadow:
        var(--sp-shadow-md),
        0 0 0 3px var(--sp-accent-light);
      outline: none;
    }

    .sp-radial-item svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      stroke: currentColor;
      fill: none;
    }

    .sp-radial-label {
      white-space: nowrap;
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-text);
      pointer-events: none;
      opacity: 0;
      padding: 4px 12px;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-sm);
      transform: translateX(4px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    .sp-radial-item:hover .sp-radial-label,
    .sp-radial-item:focus-visible .sp-radial-label {
      opacity: 1;
      transform: translateX(0);
    }

    /* ============================
       Panel (Side drawer)
       ============================ */

    .sp-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      max-width: 100vw;
      height: 100vh;
      height: 100dvh;
      background: var(--sp-glass-bg);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border-left: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xl);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    @media (max-width: 480px) {
      .sp-panel {
        width: 100vw;
        border-left: none;
      }
    }

    .sp-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      position: relative;
      z-index: 2;
    }

    .sp-panel-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
    }

    .sp-panel-close {
      width: 44px;
      height: 44px;
      border-radius: var(--sp-radius);
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--sp-text-tertiary);
      transition: all 0.2s ease;
    }

    .sp-panel-close:hover {
      background: var(--sp-bg-hover);
      color: var(--sp-text);
    }

    .sp-panel-close svg {
      width: 16px;
      height: 16px;
    }

    /* ============================
       Filters & Search
       ============================ */

    .sp-filters {
      padding: 16px 24px;
      border-bottom: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .sp-search-wrap {
      position: relative;
      margin-bottom: 12px;
    }

    .sp-search {
      width: 100%;
      height: 40px;
      padding: 0 12px 0 38px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 13px;
      outline: none;
      transition: all 0.2s ease;
    }

    .sp-search::placeholder {
      color: var(--sp-text-tertiary);
    }

    .sp-search:focus {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 3px var(--sp-accent-light);
      background: #fff;
    }

    .sp-search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--sp-text-tertiary);
      width: 16px;
      height: 16px;
      transition: color 0.2s ease;
    }

    .sp-search:focus ~ .sp-search-icon,
    .sp-search-wrap:focus-within .sp-search-icon {
      color: var(--sp-accent);
    }

    /* ============================
       Filter bar (type dropdown + status segmented)
       ============================ */

    .sp-filter-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    /* ============================
       Type filter dropdown
       ============================ */

    .sp-filter-dropdown {
      position: relative;
      flex: 1 1 auto;
      min-width: 0;
    }

    .sp-filter-dropdown-btn {
      --sp-chip-color: var(--sp-text-secondary);
      --sp-chip-bg: var(--sp-glass-bg-heavy);

      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 32px;
      padding: 0 8px 0 10px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
    }

    .sp-filter-dropdown-btn:hover {
      border-color: var(--sp-chip-color);
      background: var(--sp-chip-bg);
    }

    .sp-filter-dropdown-btn[aria-expanded="true"] {
      border-color: var(--sp-chip-color);
      background: var(--sp-chip-bg);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--sp-chip-color) 14%, transparent);
    }

    .sp-filter-dropdown-btn--filtered {
      border-color: var(--sp-chip-color);
      background: var(--sp-chip-bg);
    }

    .sp-filter-dropdown-btn__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-btn__icon svg {
      width: 14px;
      height: 14px;
    }

    .sp-filter-dropdown-btn__label {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .sp-filter-dropdown-btn__prefix {
      color: var(--sp-text-tertiary);
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .sp-filter-dropdown-btn__value {
      color: var(--sp-chip-color);
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sp-filter-dropdown-btn__chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--sp-text-tertiary);
      transition: transform 0.18s ease, color 0.18s ease;
    }

    .sp-filter-dropdown-btn__chevron svg {
      width: 12px;
      height: 12px;
    }

    .sp-filter-dropdown-btn[aria-expanded="true"] .sp-filter-dropdown-btn__chevron {
      transform: rotate(180deg);
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      min-width: 180px;
      padding: 4px;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-md);
      z-index: 10;
      animation: sp-filter-menu-in 0.15s ease-out both;
    }

    @keyframes sp-filter-menu-in {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .sp-filter-dropdown-option {
      --sp-chip-color: var(--sp-text-secondary);
      --sp-chip-bg: transparent;

      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 10px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s ease, color 0.12s ease;
    }

    .sp-filter-dropdown-option__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: 6px;
      background: var(--sp-chip-bg);
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-option__icon svg {
      width: 13px;
      height: 13px;
    }

    .sp-filter-dropdown-option__label {
      flex: 1;
      min-width: 0;
    }

    .sp-filter-dropdown-option__check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
      color: var(--sp-chip-color);
    }

    .sp-filter-dropdown-option__check svg {
      width: 13px;
      height: 13px;
    }

    .sp-filter-dropdown-option:hover {
      background: var(--sp-bg-hover);
    }

    .sp-filter-dropdown-option--active {
      color: var(--sp-chip-color);
      font-weight: 600;
    }

    .sp-filter-dropdown-option--active:hover {
      background: var(--sp-chip-bg);
    }

    /* ============================
       Status segmented control
       ============================ */

    .sp-segmented {
      display: inline-flex;
      align-items: stretch;
      padding: 2px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      flex-shrink: 0;
    }

    .sp-segmented__btn {
      --sp-chip-color: var(--sp-text-tertiary);
      --sp-chip-bg: transparent;

      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 26px;
      padding: 0 10px;
      border: none;
      border-radius: var(--sp-radius-full);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
    }

    .sp-segmented__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 13px;
      height: 13px;
      flex-shrink: 0;
      color: var(--sp-chip-color);
      transition: color 0.18s ease, transform 0.18s ease;
    }

    .sp-segmented__icon svg {
      width: 13px;
      height: 13px;
    }

    .sp-segmented__btn:hover {
      color: var(--sp-chip-color);
    }

    .sp-segmented__btn:hover .sp-segmented__icon {
      color: var(--sp-chip-color);
    }

    .sp-segmented__btn--active {
      background: var(--sp-chip-bg);
      color: var(--sp-chip-color);
      font-weight: 600;
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--sp-chip-color) 35%, transparent),
        0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .sp-segmented__btn--active .sp-segmented__icon {
      color: var(--sp-chip-color);
    }

    .sp-segmented__btn--open.sp-segmented__btn--active .sp-segmented__icon {
      animation: sp-segmented-pulse 2.4s ease-in-out infinite;
    }

    @keyframes sp-segmented-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(0.85); }
    }

    @media (prefers-reduced-motion: reduce) {
      .sp-filter-dropdown-btn,
      .sp-filter-dropdown-btn__chevron,
      .sp-filter-dropdown-option,
      .sp-segmented__btn,
      .sp-segmented__icon {
        transition: none;
      }
      .sp-filter-dropdown-menu {
        animation: none;
      }
      .sp-segmented__btn--open.sp-segmented__btn--active .sp-segmented__icon {
        animation: none;
      }
    }

    /* ============================
       Feedback Cards
       ============================ */

    .sp-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 12px;
    }

    .sp-list::-webkit-scrollbar {
      width: 6px;
    }

    .sp-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .sp-list::-webkit-scrollbar-thumb {
      background: var(--sp-border);
      border-radius: var(--sp-radius-full);
    }

    .sp-list::-webkit-scrollbar-thumb:hover {
      background: var(--sp-text-tertiary);
    }

    .sp-card {
      display: flex;
      padding: 14px 16px;
      margin-bottom: 6px;
      cursor: pointer;
      border-radius: var(--sp-radius);
      background: var(--sp-glass-bg-heavy);
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xs);
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .sp-card:hover {
      background: #fff;
      border-color: var(--sp-border);
      box-shadow: var(--sp-shadow-md);
      transform: translateY(-2px);
    }

    .sp-card:active {
      transform: translateY(0) scale(0.99);
      transition-duration: 0.1s;
    }

    .sp-card-bar {
      width: 3px;
      border-radius: var(--sp-radius-full);
      margin-right: 14px;
      flex-shrink: 0;
    }

    .sp-card-body {
      flex: 1;
      min-width: 0;
    }

    .sp-card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .sp-card-number {
      font-size: 12px;
      font-weight: 700;
      color: var(--sp-text-tertiary);
      font-variant-numeric: tabular-nums;
    }

    .sp-badge {
      padding: 2px 10px;
      border-radius: var(--sp-radius-full);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .sp-card-date {
      font-size: 11px;
      color: var(--sp-text-tertiary);
      margin-left: auto;
    }

    .sp-card-message {
      font-size: 13px;
      line-height: 1.5;
      color: var(--sp-text);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sp-card-message--expanded {
      -webkit-line-clamp: unset;
    }

    .sp-card-expand {
      font-size: 12px;
      font-weight: 500;
      color: var(--sp-accent);
      cursor: pointer;
      background: none;
      border: none;
      padding: 4px 0;
      font-family: var(--sp-font);
      transition: opacity 0.15s ease;
    }

    .sp-card-expand:hover {
      opacity: 0.8;
    }

    .sp-card-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 10px;
    }

    .sp-btn-resolve,
    .sp-btn-delete {
      padding: 8px 14px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }

    .sp-btn-resolve svg,
    .sp-btn-delete svg {
      width: 14px;
      height: 14px;
    }

    .sp-btn-resolve:hover {
      border-color: #22c55e;
      color: #22c55e;
      background: rgba(34, 197, 94, 0.06);
    }

    .sp-btn-delete:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }

    .sp-btn-resolve:disabled,
    .sp-btn-delete:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    .sp-spinner--sm {
      width: 14px;
      height: 14px;
    }

    /* ---- Delete All (header) ---- */

    .sp-panel-header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sp-btn-delete-all {
      padding: 5px 12px;
      border-radius: var(--sp-radius-full);
      border: 1px solid var(--sp-border);
      background: transparent;
      color: var(--sp-text-tertiary);
      font-family: var(--sp-font);
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.2s ease;
    }

    .sp-btn-delete-all svg {
      width: 13px;
      height: 13px;
    }

    .sp-btn-delete-all:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.06);
    }

    .sp-btn-delete-all:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ---- Confirm Dialog ---- */

    .sp-confirm-backdrop {
      position: fixed;
      inset: 0;
      background: var(--sp-backdrop, rgba(15, 23, 42, 0.2));
      backdrop-filter: blur(var(--sp-blur));
      -webkit-backdrop-filter: blur(var(--sp-blur));
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: ${2147483647};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .sp-confirm-dialog {
      width: 340px;
      padding: 28px;
      border-radius: 20px;
      background: var(--sp-glass-bg-heavy);
      backdrop-filter: blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter: blur(var(--sp-blur-heavy));
      border: 1px solid var(--sp-glass-border);
      box-shadow: var(--sp-shadow-xl);
      font-family: var(--sp-font);
      transform: translateY(8px) scale(0.97);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sp-confirm-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .sp-confirm-message {
      font-size: 14px;
      color: var(--sp-text-secondary);
      line-height: 1.5;
      margin-bottom: 20px;
    }

    .sp-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .sp-btn-danger {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: none;
      background: #ef4444;
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
    }

    .sp-btn-danger:hover {
      background: #dc2626;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
      transform: translateY(-1px);
    }

    .sp-btn-danger:active {
      transform: translateY(0) scale(0.98);
      transition-duration: 0.1s;
    }

    .sp-card--resolved {
      opacity: 0.5;
    }

    .sp-card--resolved .sp-card-message {
      text-decoration: line-through;
      text-decoration-color: var(--sp-text-tertiary);
    }

    /* ============================
       Loading State
       ============================ */

    .sp-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
    }

    /* ============================
       Identity Form
       ============================ */

    .sp-identity-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--sp-text);
      letter-spacing: -0.02em;
    }

    .sp-input {
      width: 100%;
      height: 42px;
      padding: 0 14px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text);
      font-family: var(--sp-font);
      font-size: 14px;
      outline: none;
      transition: all 0.2s ease;
    }

    .sp-input::placeholder {
      color: var(--sp-text-tertiary);
    }

    .sp-input:focus {
      border-color: var(--sp-accent);
      box-shadow: 0 0 0 3px var(--sp-accent-light);
      background: #fff;
    }

    .sp-input-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--sp-text-secondary);
      margin-bottom: 6px;
      display: block;
    }

    /* ============================
       Buttons
       ============================ */

    .sp-btn-primary {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: none;
      background: var(--sp-accent-gradient);
      color: #fff;
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px var(--sp-accent-glow);
    }

    .sp-btn-primary:hover {
      box-shadow: 0 4px 16px var(--sp-accent-glow);
      transform: translateY(-1px);
    }

    .sp-btn-primary:active {
      transform: translateY(0) scale(0.98);
      transition-duration: 0.1s;
    }

    .sp-btn-primary:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .sp-btn-ghost {
      height: 40px;
      padding: 0 22px;
      border-radius: var(--sp-radius);
      border: 1px solid var(--sp-border);
      background: var(--sp-glass-bg-heavy);
      color: var(--sp-text-secondary);
      font-family: var(--sp-font);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .sp-btn-ghost:hover {
      border-color: var(--sp-accent);
      color: var(--sp-accent);
      background: var(--sp-accent-light);
    }

    /* ============================
       Empty State
       ============================ */

    .sp-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 56px 24px;
      color: var(--sp-text-tertiary);
      text-align: center;
      gap: 8px;
      animation: sp-fade-in 0.3s ease-out both;
    }

    .sp-empty-text {
      font-size: 14px;
      font-weight: 500;
    }

    /* ============================
       Load More
       ============================ */

    .sp-load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 12px 0 4px;
    }

    .sp-btn-load-more {
      width: 100%;
    }

    /* ============================
       Forced Colors / High Contrast
       ============================ */

    @media (forced-colors: active) {
      .sp-fab,
      .sp-radial-item,
      .sp-filter-dropdown-btn,
      .sp-segmented,
      .sp-segmented__btn,
      .sp-card,
      .sp-panel-close,
      .sp-search,
      .sp-btn-resolve,
      .sp-btn-delete,
      .sp-btn-delete-all,
      .sp-btn-primary,
      .sp-btn-ghost,
      .sp-btn-danger,
      .sp-card-expand,
      .sp-input,
      .sp-confirm-dialog {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
        color: ButtonText !important;
      }

      .sp-segmented__btn--active {
        background: Highlight !important;
        color: HighlightText !important;
      }

      .sp-filter-dropdown-menu {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
      }

      .sp-filter-dropdown-option--active {
        background: Highlight !important;
        color: HighlightText !important;
      }

      .sp-fab:focus-visible,
      .sp-radial-item:focus-visible,
      .sp-filter-dropdown-btn:focus-visible,
      .sp-segmented__btn:focus-visible,
      .sp-filter-dropdown-option:focus-visible,
      .sp-panel-close:focus-visible,
      .sp-btn-resolve:focus-visible,
      .sp-btn-delete:focus-visible,
      .sp-btn-delete-all:focus-visible,
      .sp-btn-primary:focus-visible,
      .sp-btn-ghost:focus-visible,
      .sp-btn-danger:focus-visible,
      .sp-card-expand:focus-visible,
      .sp-input:focus-visible,
      .sp-search:focus-visible {
        outline: 3px solid Highlight !important;
      }

      .sp-panel {
        border: 2px solid ButtonText !important;
      }

      .sp-fab-badge {
        border: 2px solid ButtonText !important;
        background: Canvas !important;
        color: ButtonText !important;
      }

      .sp-card-bar {
        background: ButtonText !important;
      }
    }

    ${cs}
    ${rs}
    ${is}
    ${Xt}
    ${Yt}
    ${ps}
    ${Zt}
  `}var xn=120,kn=80,Se=class{constructor(e,t="en"){this.colors=e;this.locale=t;this.root=p("div",{style:`
        position: fixed;
        z-index: ${2147483647};
        max-width: 280px;
        padding: 12px 14px;
        border-radius: 14px;
        background: ${this.colors.glassBgHeavy};
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid ${this.colors.glassBorder};
        box-shadow: 0 8px 32px ${this.colors.shadow}, 0 2px 8px ${this.colors.shadow};
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(6px) scale(0.97);
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        visibility: hidden;
        -webkit-font-smoothing: antialiased;
      `}),this.root.setAttribute("role","tooltip"),this.root.id=this.tooltipId,this.arrow=p("div",{style:`
        position: absolute;
        width: 12px;
        height: 12px;
        background: ${this.colors.glassBgHeavy};
        border: 1px solid ${this.colors.glassBorder};
        transform: rotate(45deg);
        pointer-events: none;
      `}),this.root.appendChild(this.arrow),this.root.addEventListener("mouseenter",()=>this.cancelHide()),this.root.addEventListener("mouseleave",()=>this.scheduleHide()),document.body.appendChild(this.root)}colors;locale;root;arrow;showTimer=null;hideTimer=null;currentFeedbackId=null;tooltipId="sp-tooltip";show(e,t){this.currentFeedbackId!==e.id&&(this.cancelHide(),this.cancelShow(),this.showTimer=setTimeout(()=>{this.currentFeedbackId=e.id,this.render(e),this.position(t);let s=typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;this.root.style.transition=s?"none":"",this.root.style.visibility="visible",this.root.style.opacity="1",this.root.style.transform="translateY(0) scale(1)"},xn))}scheduleHide(){this.cancelHide(),this.hideTimer=setTimeout(()=>this.hide(),kn)}hide(){this.cancelShow(),this.currentFeedbackId=null,this.root.style.opacity="0",this.root.style.transform="translateY(6px) scale(0.97)",setTimeout(()=>{this.currentFeedbackId||(this.root.style.visibility="hidden")},200)}cancelShow(){this.showTimer&&(clearTimeout(this.showTimer),this.showTimer=null)}cancelHide(){this.hideTimer&&(clearTimeout(this.hideTimer),this.hideTimer=null)}render(e){let t=Array.from(this.root.children);for(let u of t)u!==this.arrow&&u.remove();let s=F(e.type,this.colors),o=P(e.type,this.colors),i=de(this.locale),r=O(e.type,i),a=p("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:8px;"}),l=p("span",{style:`
        padding:3px 10px;border-radius:9999px;
        font-size:11px;font-weight:600;
        color:${s};background:${o};
        letter-spacing:0.02em;
      `});h(l,r);let c=p("span",{style:`font-size:11px;color:${this.colors.textSecondary};margin-left:auto;`});h(c,ee(e.createdAt,this.locale)),a.appendChild(l),a.appendChild(c);let d=p("div",{style:`font-size:13px;line-height:1.55;color:${this.colors.text};display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`});h(d,e.message),this.root.insertBefore(a,this.arrow),this.root.insertBefore(d,this.arrow)}position(e){let t=this.root.getBoundingClientRect(),s=10,o=e.top-t.height-s,i=e.left+e.width/2-t.width/2,r=!0;o<8&&(o=e.bottom+s,r=!1),i=Math.max(8,Math.min(i,window.innerWidth-t.width-8)),this.root.style.top=`${o}px`,this.root.style.left=`${i}px`;let a=Math.max(16,Math.min(e.left+e.width/2-i-6,t.width-22));r?this.arrow.style.cssText=`
        position:absolute;
        width:12px;height:12px;
        background:${this.colors.glassBgHeavy};
        border-right:1px solid ${this.colors.glassBorder};
        border-bottom:1px solid ${this.colors.glassBorder};
        transform:rotate(45deg);
        pointer-events:none;
        bottom:-6px;
        left:${a}px;
      `:this.arrow.style.cssText=`
        position:absolute;
        width:12px;height:12px;
        background:${this.colors.glassBgHeavy};
        border-left:1px solid ${this.colors.glassBorder};
        border-top:1px solid ${this.colors.glassBorder};
        transform:rotate(45deg);
        pointer-events:none;
        top:-6px;
        left:${a}px;
      `}contains(e){return this.root.contains(e)}destroy(){this.cancelShow(),this.cancelHide(),this.root.remove()}};var X=null;function Te(){let n=()=>{};return{destroy:n,open:n,close:n,refresh:n,on:()=>n,off:n}}function ds(n){let e=n.debug?(...g)=>console.debug("[siteping]",...g):()=>{};if(X)return e("initSiteping() called more than once \u2014 returning existing instance"),X;if(!n.forceShow)try{if(typeof process<"u"){let g="production";return console.info("[siteping] Widget not loaded: production mode detected. Use forceShow: true to override."),n.onSkip?.(g),Te()}}catch{}if(window.innerWidth<768){let g="mobile";return console.info(`[siteping] Widget not loaded: viewport width < ${768}px (mobile not supported).`),n.onSkip?.(g),Te()}if(!n.store&&(!n.endpoint||typeof n.endpoint!="string"))return console.error("[siteping] Missing 'endpoint' or 'store' in config. Provide an endpoint like '/api/siteping' or a SitepingStore instance."),Te();if(!n.projectName||typeof n.projectName!="string")return console.error("[siteping] Missing or invalid 'projectName' in config. Expected a non-empty string."),Te();let t=n.locale??"en",s=de(t),o=n.scopeAnnotationsByUrl??!0,i=()=>{try{let g=n.getPageScope?.();if(g)return g}catch(g){e("getPageScope() threw, falling back to pathname:",g)}return{url:window.location.pathname,urlPattern:null}};e("Initializing widget",{projectName:n.projectName,theme:n.theme??"light",locale:t,scopeAnnotationsByUrl:o});let r=wt(n.accentColor,n.theme),a=new q,l=new q,c=n.store?new Ee(n.store,n.projectName):new pe(n.endpoint,n.projectName);n.onOpen&&a.on("open",n.onOpen),n.onClose&&a.on("close",n.onClose),n.onFeedbackSent&&a.on("feedback:sent",n.onFeedbackSent),n.onError&&a.on("feedback:error",n.onError),n.onAnnotationStart&&a.on("annotation:start",n.onAnnotationStart),n.onAnnotationEnd&&a.on("annotation:end",n.onAnnotationEnd),a.on("feedback:sent",g=>l.emit("feedback:sent",g)),a.on("feedback:deleted",g=>l.emit("feedback:deleted",g)),a.on("open",()=>l.emit("panel:open")),a.on("close",()=>l.emit("panel:close")),a.on("open",()=>e("Panel opened")),a.on("close",()=>e("Panel closed")),a.on("feedback:sent",g=>e("Feedback sent",g.id)),a.on("feedback:error",g=>e("Feedback failed",g.message)),a.on("annotation:start",()=>e("Annotation started")),a.on("annotation:end",()=>e("Annotation ended"));let d=document.createElement("siteping-widget");d.style.cssText=`position:fixed;z-index:${2147483647};`;let u=!1;try{typeof process<"u"&&process.env?.["NODE_ENV"]==="test"&&(u=!0)}catch{}let b=u?"open":"closed",f=d.attachShadow({mode:b});if("adoptedStyleSheets"in ShadowRoot.prototype){let g=new CSSStyleSheet;g.replaceSync(Ze(r)),f.adoptedStyleSheets=[g]}else{let g=document.createElement("style");g.textContent=Ze(r),f.appendChild(g)}document.body.appendChild(d);let w=document.createElement("div");w.setAttribute("role","status"),w.setAttribute("aria-live","polite"),w.setAttribute("aria-atomic","true"),w.style.cssText="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;",document.body.appendChild(w);let C=new Se(r,t),E=new ge(r,C,a,s),B=new ce(f,n,a,s),m=new Ce(f,r,a,c,n.projectName,E,s,t,{getScope:i,scopeAnnotationsByUrl:o}),v=new le(r,a,s,n.enableScreenshot??!1),k=!1,S=a.on("annotation:complete",async g=>{if(!k){k=!0;try{let{annotation:M,type:L,message:N,screenshotDataUrl:Ae}=g,H=Ot();if(!H){if(H=await Cn(f,s),!H)return;Nt(H)}let us=(()=>{try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}})(),Le=i(),hs={projectName:n.projectName,type:L,message:N,url:Le.url,urlPattern:Le.urlPattern,viewport:`${window.innerWidth}x${window.innerHeight}`,userAgent:navigator.userAgent,authorName:H.name,authorEmail:H.email,annotations:[M],clientId:us,screenshotDataUrl:Ae??null};try{let D=await c.sendFeedback(hs);a.emit("feedback:sent",D),(!o||D.url===Le.url)&&E.addFeedback(D,E.count+1),w.textContent=s("feedback.sent.confirmation"),await m.refresh()}catch(D){a.emit("feedback:error",D instanceof Error?D:new Error(String(D))),w.textContent=s("feedback.error.message")}}finally{k=!1}}}),T=i(),A=o?{limit:20,url:T.url}:{limit:20};return c.getFeedbacks(n.projectName,A).then(({feedbacks:g})=>{let M=o?g.filter(L=>L.url===T.url):g;E.render(M)}).catch(g=>{e("Failed to load initial markers:",g)}),n.endpoint&&At(n.endpoint).then(()=>e("Retry queue flushed")).catch(()=>{}),X={destroy:()=>{e("Destroying widget"),S(),B.destroy(),m.destroy(),v.destroy(),E.destroy(),C.destroy(),a.removeAll(),l.removeAll(),w.remove(),d.remove(),X=null},open:()=>{m.open()},close:()=>{m.close()},refresh:()=>{if(m.isCurrentlyOpen){m.refresh();return}let g=i(),M=o?{limit:20,url:g.url}:{limit:20};c.getFeedbacks(n.projectName,M).then(({feedbacks:L})=>{let N=o?L.filter(Ae=>Ae.url===g.url):L;E.render(N)}).catch(()=>{})},on:(g,M)=>l.on(g,M),off:(g,M)=>{l.off(g,M)}},X}function Cn(n,e){return new Promise(t=>{let s=n.activeElement??document.activeElement,o=document.createElement("div");o.style.cssText=`
      position:fixed;inset:0;
      background:var(--sp-identity-overlay);
      backdrop-filter:blur(8px);
      -webkit-backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;
      z-index:${2147483647};
      opacity:0;transition:opacity 0.25s ease;
    `;let i=document.createElement("div");i.style.cssText=`
      width:340px;padding:28px;border-radius:var(--sp-radius-xl);
      background:var(--sp-identity-bg);
      backdrop-filter:blur(var(--sp-blur-heavy));
      -webkit-backdrop-filter:blur(var(--sp-blur-heavy));
      border:1px solid var(--sp-glass-border);
      box-shadow:0 16px 48px var(--sp-shadow), 0 8px 16px var(--sp-shadow);
      font-family:var(--sp-font, "Inter",system-ui,-apple-system,sans-serif);
      color:var(--sp-text);
      transform:translateY(12px) scale(0.97);
      transition:transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      -webkit-font-smoothing:antialiased;
    `;let r=`sp-identity-title-${Date.now()}`;i.setAttribute("role","dialog"),i.setAttribute("aria-modal","true"),i.setAttribute("aria-labelledby",r);let a=document.createElement("div");a.className="sp-identity-title",a.id=r,a.textContent=e("identity.title"),a.style.marginBottom="20px";let l=`sp-identity-name-${Date.now()}`,c=`sp-identity-email-${Date.now()}`,d=document.createElement("label");d.className="sp-input-label",d.textContent=e("identity.nameLabel"),d.setAttribute("for",l);let u=document.createElement("input");u.className="sp-input",u.id=l,u.type="text",u.placeholder=e("identity.namePlaceholder"),u.style.marginBottom="14px";let b=document.createElement("label");b.className="sp-input-label",b.textContent=e("identity.emailLabel"),b.setAttribute("for",c);let f=document.createElement("input");f.className="sp-input",f.id=c,f.type="email",f.placeholder=e("identity.emailPlaceholder");let x=document.createElement("div");x.style.cssText="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;";let w=v=>{o.removeEventListener("keydown",m),o.style.opacity="0",i.style.transform="translateY(12px) scale(0.97)",setTimeout(()=>{o.remove(),s?.focus(),t(v)},250)},C=document.createElement("button");C.className="sp-btn-ghost",C.textContent=e("identity.cancel"),C.addEventListener("click",()=>w(null));let E=document.createElement("button");E.className="sp-btn-primary",E.textContent=e("identity.submit"),E.addEventListener("click",()=>{let v=u.value.trim(),k=f.value.trim();if(!v||!k)return;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k)){f.style.borderColor="var(--sp-type-bug, #ef4444)";return}w({name:v,email:k})});let B='input, button, [tabindex]:not([tabindex="-1"])',m=v=>{let k=v;if(k.key==="Escape"){w(null);return}if(k.key==="Tab"){let S=Array.from(i.querySelectorAll(B));if(S.length===0)return;let T=S[0],A=S[S.length-1];if(!T||!A)return;let g=n.activeElement;k.shiftKey?(g===T||!i.contains(g))&&(k.preventDefault(),A.focus()):(g===A||!i.contains(g))&&(k.preventDefault(),T.focus())}};o.addEventListener("keydown",m),o.addEventListener("click",v=>{v.target===o&&w(null)}),x.appendChild(C),x.appendChild(E),i.appendChild(a),i.appendChild(d),i.appendChild(u),i.appendChild(b),i.appendChild(f),i.appendChild(x),o.appendChild(i),n.appendChild(o),requestAnimationFrame(()=>{o.style.opacity="1",i.style.transform="translateY(0) scale(1)",u.focus()})})}function Ii(n){return ds(n)}export{Ii as initSiteping};
//# sourceMappingURL=index.js.map