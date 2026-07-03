var fx=i=>{throw TypeError(i)};var rf=(i,e,t)=>e.has(i)||fx("Cannot "+t);var G=(i,e,t)=>(rf(i,e,"read from private field"),t?t.call(i):e.get(i)),rt=(i,e,t)=>e.has(i)?fx("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),Be=(i,e,t,r)=>(rf(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),xt=(i,e,t)=>(rf(i,e,"access private method"),t);var uu=(i,e,t,r)=>({set _(a){Be(i,e,a,t)},get _(){return G(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function SM(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var sf={exports:{}},Tl={},af={exports:{}},Et={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var px;function MM(){if(px)return Et;px=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),x=Symbol.for("react.lazy"),p=Symbol.iterator;function v(z){return z===null||typeof z!="object"?null:(z=p&&z[p]||z["@@iterator"],typeof z=="function"?z:null)}var _={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,w={};function M(z,ie,Ie){this.props=z,this.context=ie,this.refs=w,this.updater=Ie||_}M.prototype.isReactComponent={},M.prototype.setState=function(z,ie){if(typeof z!="object"&&typeof z!="function"&&z!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,z,ie,"setState")},M.prototype.forceUpdate=function(z){this.updater.enqueueForceUpdate(this,z,"forceUpdate")};function S(){}S.prototype=M.prototype;function A(z,ie,Ie){this.props=z,this.context=ie,this.refs=w,this.updater=Ie||_}var L=A.prototype=new S;L.constructor=A,E(L,M.prototype),L.isPureReactComponent=!0;var C=Array.isArray,I=Object.prototype.hasOwnProperty,N={current:null},U={key:!0,ref:!0,__self:!0,__source:!0};function b(z,ie,Ie){var je,He={},H=null,ve=null;if(ie!=null)for(je in ie.ref!==void 0&&(ve=ie.ref),ie.key!==void 0&&(H=""+ie.key),ie)I.call(ie,je)&&!U.hasOwnProperty(je)&&(He[je]=ie[je]);var fe=arguments.length-2;if(fe===1)He.children=Ie;else if(1<fe){for(var te=Array(fe),Fe=0;Fe<fe;Fe++)te[Fe]=arguments[Fe+2];He.children=te}if(z&&z.defaultProps)for(je in fe=z.defaultProps,fe)He[je]===void 0&&(He[je]=fe[je]);return{$$typeof:i,type:z,key:H,ref:ve,props:He,_owner:N.current}}function D(z,ie){return{$$typeof:i,type:z.type,key:ie,ref:z.ref,props:z.props,_owner:z._owner}}function O(z){return typeof z=="object"&&z!==null&&z.$$typeof===i}function V(z){var ie={"=":"=0",":":"=2"};return"$"+z.replace(/[=:]/g,function(Ie){return ie[Ie]})}var W=/\/+/g;function j(z,ie){return typeof z=="object"&&z!==null&&z.key!=null?V(""+z.key):ie.toString(36)}function ue(z,ie,Ie,je,He){var H=typeof z;(H==="undefined"||H==="boolean")&&(z=null);var ve=!1;if(z===null)ve=!0;else switch(H){case"string":case"number":ve=!0;break;case"object":switch(z.$$typeof){case i:case e:ve=!0}}if(ve)return ve=z,He=He(ve),z=je===""?"."+j(ve,0):je,C(He)?(Ie="",z!=null&&(Ie=z.replace(W,"$&/")+"/"),ue(He,ie,Ie,"",function(Fe){return Fe})):He!=null&&(O(He)&&(He=D(He,Ie+(!He.key||ve&&ve.key===He.key?"":(""+He.key).replace(W,"$&/")+"/")+z)),ie.push(He)),1;if(ve=0,je=je===""?".":je+":",C(z))for(var fe=0;fe<z.length;fe++){H=z[fe];var te=je+j(H,fe);ve+=ue(H,ie,Ie,te,He)}else if(te=v(z),typeof te=="function")for(z=te.call(z),fe=0;!(H=z.next()).done;)H=H.value,te=je+j(H,fe++),ve+=ue(H,ie,Ie,te,He);else if(H==="object")throw ie=String(z),Error("Objects are not valid as a React child (found: "+(ie==="[object Object]"?"object with keys {"+Object.keys(z).join(", ")+"}":ie)+"). If you meant to render a collection of children, use an array instead.");return ve}function q(z,ie,Ie){if(z==null)return z;var je=[],He=0;return ue(z,je,"","",function(H){return ie.call(Ie,H,He++)}),je}function pe(z){if(z._status===-1){var ie=z._result;ie=ie(),ie.then(function(Ie){(z._status===0||z._status===-1)&&(z._status=1,z._result=Ie)},function(Ie){(z._status===0||z._status===-1)&&(z._status=2,z._result=Ie)}),z._status===-1&&(z._status=0,z._result=ie)}if(z._status===1)return z._result.default;throw z._result}var J={current:null},K={transition:null},re={ReactCurrentDispatcher:J,ReactCurrentBatchConfig:K,ReactCurrentOwner:N};function he(){throw Error("act(...) is not supported in production builds of React.")}return Et.Children={map:q,forEach:function(z,ie,Ie){q(z,function(){ie.apply(this,arguments)},Ie)},count:function(z){var ie=0;return q(z,function(){ie++}),ie},toArray:function(z){return q(z,function(ie){return ie})||[]},only:function(z){if(!O(z))throw Error("React.Children.only expected to receive a single React element child.");return z}},Et.Component=M,Et.Fragment=t,Et.Profiler=a,Et.PureComponent=A,Et.StrictMode=r,Et.Suspense=h,Et.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=re,Et.act=he,Et.cloneElement=function(z,ie,Ie){if(z==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+z+".");var je=E({},z.props),He=z.key,H=z.ref,ve=z._owner;if(ie!=null){if(ie.ref!==void 0&&(H=ie.ref,ve=N.current),ie.key!==void 0&&(He=""+ie.key),z.type&&z.type.defaultProps)var fe=z.type.defaultProps;for(te in ie)I.call(ie,te)&&!U.hasOwnProperty(te)&&(je[te]=ie[te]===void 0&&fe!==void 0?fe[te]:ie[te])}var te=arguments.length-2;if(te===1)je.children=Ie;else if(1<te){fe=Array(te);for(var Fe=0;Fe<te;Fe++)fe[Fe]=arguments[Fe+2];je.children=fe}return{$$typeof:i,type:z.type,key:He,ref:H,props:je,_owner:ve}},Et.createContext=function(z){return z={$$typeof:c,_currentValue:z,_currentValue2:z,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},z.Provider={$$typeof:l,_context:z},z.Consumer=z},Et.createElement=b,Et.createFactory=function(z){var ie=b.bind(null,z);return ie.type=z,ie},Et.createRef=function(){return{current:null}},Et.forwardRef=function(z){return{$$typeof:d,render:z}},Et.isValidElement=O,Et.lazy=function(z){return{$$typeof:x,_payload:{_status:-1,_result:z},_init:pe}},Et.memo=function(z,ie){return{$$typeof:f,type:z,compare:ie===void 0?null:ie}},Et.startTransition=function(z){var ie=K.transition;K.transition={};try{z()}finally{K.transition=ie}},Et.unstable_act=he,Et.useCallback=function(z,ie){return J.current.useCallback(z,ie)},Et.useContext=function(z){return J.current.useContext(z)},Et.useDebugValue=function(){},Et.useDeferredValue=function(z){return J.current.useDeferredValue(z)},Et.useEffect=function(z,ie){return J.current.useEffect(z,ie)},Et.useId=function(){return J.current.useId()},Et.useImperativeHandle=function(z,ie,Ie){return J.current.useImperativeHandle(z,ie,Ie)},Et.useInsertionEffect=function(z,ie){return J.current.useInsertionEffect(z,ie)},Et.useLayoutEffect=function(z,ie){return J.current.useLayoutEffect(z,ie)},Et.useMemo=function(z,ie){return J.current.useMemo(z,ie)},Et.useReducer=function(z,ie,Ie){return J.current.useReducer(z,ie,Ie)},Et.useRef=function(z){return J.current.useRef(z)},Et.useState=function(z){return J.current.useState(z)},Et.useSyncExternalStore=function(z,ie,Ie){return J.current.useSyncExternalStore(z,ie,Ie)},Et.useTransition=function(){return J.current.useTransition()},Et.version="18.3.1",Et}var mx;function fm(){return mx||(mx=1,af.exports=MM()),af.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var gx;function EM(){if(gx)return Tl;gx=1;var i=fm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var x,p={},v=null,_=null;f!==void 0&&(v=""+f),h.key!==void 0&&(v=""+h.key),h.ref!==void 0&&(_=h.ref);for(x in h)r.call(h,x)&&!l.hasOwnProperty(x)&&(p[x]=h[x]);if(d&&d.defaultProps)for(x in h=d.defaultProps,h)p[x]===void 0&&(p[x]=h[x]);return{$$typeof:e,type:d,key:v,ref:_,props:p,_owner:a.current}}return Tl.Fragment=t,Tl.jsx=c,Tl.jsxs=c,Tl}var xx;function wM(){return xx||(xx=1,sf.exports=EM()),sf.exports}var m=wM(),k=fm();const bM=SM(k);var du={},of={exports:{}},oi={},lf={exports:{}},cf={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var vx;function TM(){return vx||(vx=1,(function(i){function e(K,re){var he=K.length;K.push(re);e:for(;0<he;){var z=he-1>>>1,ie=K[z];if(0<a(ie,re))K[z]=re,K[he]=ie,he=z;else break e}}function t(K){return K.length===0?null:K[0]}function r(K){if(K.length===0)return null;var re=K[0],he=K.pop();if(he!==re){K[0]=he;e:for(var z=0,ie=K.length,Ie=ie>>>1;z<Ie;){var je=2*(z+1)-1,He=K[je],H=je+1,ve=K[H];if(0>a(He,he))H<ie&&0>a(ve,He)?(K[z]=ve,K[H]=he,z=H):(K[z]=He,K[je]=he,z=je);else if(H<ie&&0>a(ve,he))K[z]=ve,K[H]=he,z=H;else break e}}return re}function a(K,re){var he=K.sortIndex-re.sortIndex;return he!==0?he:K.id-re.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],x=1,p=null,v=3,_=!1,E=!1,w=!1,M=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,A=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function L(K){for(var re=t(f);re!==null;){if(re.callback===null)r(f);else if(re.startTime<=K)r(f),re.sortIndex=re.expirationTime,e(h,re);else break;re=t(f)}}function C(K){if(w=!1,L(K),!E)if(t(h)!==null)E=!0,pe(I);else{var re=t(f);re!==null&&J(C,re.startTime-K)}}function I(K,re){E=!1,w&&(w=!1,S(b),b=-1),_=!0;var he=v;try{for(L(re),p=t(h);p!==null&&(!(p.expirationTime>re)||K&&!V());){var z=p.callback;if(typeof z=="function"){p.callback=null,v=p.priorityLevel;var ie=z(p.expirationTime<=re);re=i.unstable_now(),typeof ie=="function"?p.callback=ie:p===t(h)&&r(h),L(re)}else r(h);p=t(h)}if(p!==null)var Ie=!0;else{var je=t(f);je!==null&&J(C,je.startTime-re),Ie=!1}return Ie}finally{p=null,v=he,_=!1}}var N=!1,U=null,b=-1,D=5,O=-1;function V(){return!(i.unstable_now()-O<D)}function W(){if(U!==null){var K=i.unstable_now();O=K;var re=!0;try{re=U(!0,K)}finally{re?j():(N=!1,U=null)}}else N=!1}var j;if(typeof A=="function")j=function(){A(W)};else if(typeof MessageChannel<"u"){var ue=new MessageChannel,q=ue.port2;ue.port1.onmessage=W,j=function(){q.postMessage(null)}}else j=function(){M(W,0)};function pe(K){U=K,N||(N=!0,j())}function J(K,re){b=M(function(){K(i.unstable_now())},re)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(K){K.callback=null},i.unstable_continueExecution=function(){E||_||(E=!0,pe(I))},i.unstable_forceFrameRate=function(K){0>K||125<K?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):D=0<K?Math.floor(1e3/K):5},i.unstable_getCurrentPriorityLevel=function(){return v},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function(K){switch(v){case 1:case 2:case 3:var re=3;break;default:re=v}var he=v;v=re;try{return K()}finally{v=he}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function(K,re){switch(K){case 1:case 2:case 3:case 4:case 5:break;default:K=3}var he=v;v=K;try{return re()}finally{v=he}},i.unstable_scheduleCallback=function(K,re,he){var z=i.unstable_now();switch(typeof he=="object"&&he!==null?(he=he.delay,he=typeof he=="number"&&0<he?z+he:z):he=z,K){case 1:var ie=-1;break;case 2:ie=250;break;case 5:ie=1073741823;break;case 4:ie=1e4;break;default:ie=5e3}return ie=he+ie,K={id:x++,callback:re,priorityLevel:K,startTime:he,expirationTime:ie,sortIndex:-1},he>z?(K.sortIndex=he,e(f,K),t(h)===null&&K===t(f)&&(w?(S(b),b=-1):w=!0,J(C,he-z))):(K.sortIndex=ie,e(h,K),E||_||(E=!0,pe(I))),K},i.unstable_shouldYield=V,i.unstable_wrapCallback=function(K){var re=v;return function(){var he=v;v=re;try{return K.apply(this,arguments)}finally{v=he}}}})(cf)),cf}var _x;function CM(){return _x||(_x=1,lf.exports=TM()),lf.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var yx;function RM(){if(yx)return oi;yx=1;var i=fm(),e=CM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,x={},p={};function v(n){return h.call(p,n)?!0:h.call(x,n)?!1:f.test(n)?p[n]=!0:(x[n]=!0,!1)}function _(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||_(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function w(n,s,o,u,g,y,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=g,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=y,this.removeEmptyString=R}var M={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){M[n]=new w(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];M[s]=new w(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){M[n]=new w(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){M[n]=new w(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){M[n]=new w(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){M[n]=new w(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){M[n]=new w(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){M[n]=new w(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){M[n]=new w(n,5,!1,n.toLowerCase(),null,!1,!1)});var S=/[\-:]([a-z])/g;function A(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(S,A);M[s]=new w(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(S,A);M[s]=new w(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(S,A);M[s]=new w(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){M[n]=new w(n,1,!1,n.toLowerCase(),null,!1,!1)}),M.xlinkHref=new w("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){M[n]=new w(n,1,!1,n.toLowerCase(),null,!0,!0)});function L(n,s,o,u){var g=M.hasOwnProperty(s)?M[s]:null;(g!==null?g.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,g,u)&&(o=null),u||g===null?v(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):g.mustUseProperty?n[g.propertyName]=o===null?g.type===3?!1:"":o:(s=g.attributeName,u=g.attributeNamespace,o===null?n.removeAttribute(s):(g=g.type,o=g===3||g===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,I=Symbol.for("react.element"),N=Symbol.for("react.portal"),U=Symbol.for("react.fragment"),b=Symbol.for("react.strict_mode"),D=Symbol.for("react.profiler"),O=Symbol.for("react.provider"),V=Symbol.for("react.context"),W=Symbol.for("react.forward_ref"),j=Symbol.for("react.suspense"),ue=Symbol.for("react.suspense_list"),q=Symbol.for("react.memo"),pe=Symbol.for("react.lazy"),J=Symbol.for("react.offscreen"),K=Symbol.iterator;function re(n){return n===null||typeof n!="object"?null:(n=K&&n[K]||n["@@iterator"],typeof n=="function"?n:null)}var he=Object.assign,z;function ie(n){if(z===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);z=s&&s[1]||""}return`
`+z+n}var Ie=!1;function je(n,s){if(!n||Ie)return"";Ie=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(ge){var u=ge}Reflect.construct(n,[],s)}else{try{s.call()}catch(ge){u=ge}n.call(s.prototype)}else{try{throw Error()}catch(ge){u=ge}n()}}catch(ge){if(ge&&u&&typeof ge.stack=="string"){for(var g=ge.stack.split(`
`),y=u.stack.split(`
`),R=g.length-1,B=y.length-1;1<=R&&0<=B&&g[R]!==y[B];)B--;for(;1<=R&&0<=B;R--,B--)if(g[R]!==y[B]){if(R!==1||B!==1)do if(R--,B--,0>B||g[R]!==y[B]){var X=`
`+g[R].replace(" at new "," at ");return n.displayName&&X.includes("<anonymous>")&&(X=X.replace("<anonymous>",n.displayName)),X}while(1<=R&&0<=B);break}}}finally{Ie=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?ie(n):""}function He(n){switch(n.tag){case 5:return ie(n.type);case 16:return ie("Lazy");case 13:return ie("Suspense");case 19:return ie("SuspenseList");case 0:case 2:case 15:return n=je(n.type,!1),n;case 11:return n=je(n.type.render,!1),n;case 1:return n=je(n.type,!0),n;default:return""}}function H(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case U:return"Fragment";case N:return"Portal";case D:return"Profiler";case b:return"StrictMode";case j:return"Suspense";case ue:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case V:return(n.displayName||"Context")+".Consumer";case O:return(n._context.displayName||"Context")+".Provider";case W:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case q:return s=n.displayName||null,s!==null?s:H(n.type)||"Memo";case pe:s=n._payload,n=n._init;try{return H(n(s))}catch{}}return null}function ve(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return H(s);case 8:return s===b?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function fe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function te(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Fe(n){var s=te(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var g=o.get,y=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return g.call(this)},set:function(R){u=""+R,y.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function Xe(n){n._valueTracker||(n._valueTracker=Fe(n))}function kt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=te(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function ct(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Nt(n,s){var o=s.checked;return he({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function bt(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=fe(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function yt(n,s){s=s.checked,s!=null&&L(n,"checked",s,!1)}function qt(n,s){yt(n,s);var o=fe(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?jt(n,s.type,o):s.hasOwnProperty("defaultValue")&&jt(n,s.type,fe(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function nn(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function jt(n,s,o){(s!=="number"||ct(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var Kt=Array.isArray;function It(n,s,o,u){if(n=n.options,s){s={};for(var g=0;g<o.length;g++)s["$"+o[g]]=!0;for(o=0;o<n.length;o++)g=s.hasOwnProperty("$"+n[o].value),n[o].selected!==g&&(n[o].selected=g),g&&u&&(n[o].defaultSelected=!0)}else{for(o=""+fe(o),s=null,g=0;g<n.length;g++){if(n[g].value===o){n[g].selected=!0,u&&(n[g].defaultSelected=!0);return}s!==null||n[g].disabled||(s=n[g])}s!==null&&(s.selected=!0)}}function Yt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return he({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Q(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if(Kt(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:fe(o)}}function mn(n,s){var o=fe(s.value),u=fe(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function Rt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function F(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?F(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var ee,ae=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,g){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,g)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(ee=ee||document.createElement("div"),ee.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=ee.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function xe(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var Te={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Ne=["Webkit","ms","Moz","O"];Object.keys(Te).forEach(function(n){Ne.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),Te[s]=Te[n]})});function _e(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||Te.hasOwnProperty(n)&&Te[n]?(""+s).trim():s+"px"}function ye(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,g=_e(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,g):n[o]=g}}var de=he({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Ue(n,s){if(s){if(de[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function Ce(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Ae=null;function Je(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var it=null,st=null,$=null;function Le(n){if(n=dl(n)){if(typeof it!="function")throw Error(t(280));var s=n.stateNode;s&&(s=bc(s),it(n.stateNode,n.type,s))}}function Se(n){st?$?$.push(n):$=[n]:st=n}function ke(){if(st){var n=st,s=$;if($=st=null,Le(n),s)for(n=0;n<s.length;n++)Le(s[n])}}function Oe(n,s){return n(s)}function Me(){}var Ye=!1;function qe(n,s,o){if(Ye)return n(s,o);Ye=!0;try{return Oe(n,s,o)}finally{Ye=!1,(st!==null||$!==null)&&(Me(),ke())}}function Wt(n,s){var o=n.stateNode;if(o===null)return null;var u=bc(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var Ot=!1;if(d)try{var Fn={};Object.defineProperty(Fn,"passive",{get:function(){Ot=!0}}),window.addEventListener("test",Fn,Fn),window.removeEventListener("test",Fn,Fn)}catch{Ot=!1}function wi(n,s,o,u,g,y,R,B,X){var ge=Array.prototype.slice.call(arguments,3);try{s.apply(o,ge)}catch(we){this.onError(we)}}var Hs=!1,Ra=null,Vs=!1,Gs=null,Td={onError:function(n){Hs=!0,Ra=n}};function oc(n,s,o,u,g,y,R,B,X){Hs=!1,Ra=null,wi.apply(Td,arguments)}function lc(n,s,o,u,g,y,R,B,X){if(oc.apply(this,arguments),Hs){if(Hs){var ge=Ra;Hs=!1,Ra=null}else throw Error(t(198));Vs||(Vs=!0,Gs=ge)}}function Xn(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Aa(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function Wo(n){if(Xn(n)!==n)throw Error(t(188))}function cc(n){var s=n.alternate;if(!s){if(s=Xn(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var g=o.return;if(g===null)break;var y=g.alternate;if(y===null){if(u=g.return,u!==null){o=u;continue}break}if(g.child===y.child){for(y=g.child;y;){if(y===o)return Wo(g),n;if(y===u)return Wo(g),s;y=y.sibling}throw Error(t(188))}if(o.return!==u.return)o=g,u=y;else{for(var R=!1,B=g.child;B;){if(B===o){R=!0,o=g,u=y;break}if(B===u){R=!0,u=g,o=y;break}B=B.sibling}if(!R){for(B=y.child;B;){if(B===o){R=!0,o=y,u=g;break}if(B===u){R=!0,u=y,o=g;break}B=B.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function js(n){return n=cc(n),n!==null?Xo(n):null}function Xo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=Xo(n);if(s!==null)return s;n=n.sibling}return null}var Ws=e.unstable_scheduleCallback,$o=e.unstable_cancelCallback,uc=e.unstable_shouldYield,Cd=e.unstable_requestPaint,ln=e.unstable_now,Rd=e.unstable_getCurrentPriorityLevel,qo=e.unstable_ImmediatePriority,P=e.unstable_UserBlockingPriority,Z=e.unstable_NormalPriority,me=e.unstable_LowPriority,le=e.unstable_IdlePriority,oe=null,De=null;function We(n){if(De&&typeof De.onCommitFiberRoot=="function")try{De.onCommitFiberRoot(oe,n,void 0,(n.current.flags&128)===128)}catch{}}var Pe=Math.clz32?Math.clz32:ht,Qe=Math.log,nt=Math.LN2;function ht(n){return n>>>=0,n===0?32:31-(Qe(n)/nt|0)|0}var ft=64,et=4194304;function At(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Qt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,g=n.suspendedLanes,y=n.pingedLanes,R=o&268435455;if(R!==0){var B=R&~g;B!==0?u=At(B):(y&=R,y!==0&&(u=At(y)))}else R=o&~g,R!==0?u=At(R):y!==0&&(u=At(y));if(u===0)return 0;if(s!==0&&s!==u&&(s&g)===0&&(g=u&-u,y=s&-s,g>=y||g===16&&(y&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Pe(s),g=1<<o,u|=n[o],s&=~g;return u}function rn(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function Ht(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,g=n.expirationTimes,y=n.pendingLanes;0<y;){var R=31-Pe(y),B=1<<R,X=g[R];X===-1?((B&o)===0||(B&u)!==0)&&(g[R]=rn(B,s)):X<=s&&(n.expiredLanes|=B),y&=~B}}function gn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function Ve(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Nn(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function St(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Pe(s),n[s]=o}function ei(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var g=31-Pe(o),y=1<<g;s[g]=0,u[g]=-1,n[g]=-1,o&=~y}}function ti(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Pe(o),g=1<<u;g&s|n[u]&s&&(n[u]|=s),o&=~g}}var Mt=0;function Er(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var zt,Jt,Fi,Vt,ki,er=!1,Xs=[],Zr=null,Jr=null,es=null,Ko=new Map,Yo=new Map,ts=[],Gy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Ym(n,s){switch(n){case"focusin":case"focusout":Zr=null;break;case"dragenter":case"dragleave":Jr=null;break;case"mouseover":case"mouseout":es=null;break;case"pointerover":case"pointerout":Ko.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":Yo.delete(s.pointerId)}}function Qo(n,s,o,u,g,y){return n===null||n.nativeEvent!==y?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:y,targetContainers:[g]},s!==null&&(s=dl(s),s!==null&&Jt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,g!==null&&s.indexOf(g)===-1&&s.push(g),n)}function jy(n,s,o,u,g){switch(s){case"focusin":return Zr=Qo(Zr,n,s,o,u,g),!0;case"dragenter":return Jr=Qo(Jr,n,s,o,u,g),!0;case"mouseover":return es=Qo(es,n,s,o,u,g),!0;case"pointerover":var y=g.pointerId;return Ko.set(y,Qo(Ko.get(y)||null,n,s,o,u,g)),!0;case"gotpointercapture":return y=g.pointerId,Yo.set(y,Qo(Yo.get(y)||null,n,s,o,u,g)),!0}return!1}function Qm(n){var s=$s(n.target);if(s!==null){var o=Xn(s);if(o!==null){if(s=o.tag,s===13){if(s=Aa(o),s!==null){n.blockedOn=s,ki(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function dc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=Pd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Ae=u,o.target.dispatchEvent(u),Ae=null}else return s=dl(o),s!==null&&Jt(s),n.blockedOn=o,!1;s.shift()}return!0}function Zm(n,s,o){dc(n)&&o.delete(s)}function Wy(){er=!1,Zr!==null&&dc(Zr)&&(Zr=null),Jr!==null&&dc(Jr)&&(Jr=null),es!==null&&dc(es)&&(es=null),Ko.forEach(Zm),Yo.forEach(Zm)}function Zo(n,s){n.blockedOn===s&&(n.blockedOn=null,er||(er=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Wy)))}function Jo(n){function s(g){return Zo(g,n)}if(0<Xs.length){Zo(Xs[0],n);for(var o=1;o<Xs.length;o++){var u=Xs[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Zr!==null&&Zo(Zr,n),Jr!==null&&Zo(Jr,n),es!==null&&Zo(es,n),Ko.forEach(s),Yo.forEach(s),o=0;o<ts.length;o++)u=ts[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<ts.length&&(o=ts[0],o.blockedOn===null);)Qm(o),o.blockedOn===null&&ts.shift()}var Pa=C.ReactCurrentBatchConfig,hc=!0;function Xy(n,s,o,u){var g=Mt,y=Pa.transition;Pa.transition=null;try{Mt=1,Ad(n,s,o,u)}finally{Mt=g,Pa.transition=y}}function $y(n,s,o,u){var g=Mt,y=Pa.transition;Pa.transition=null;try{Mt=4,Ad(n,s,o,u)}finally{Mt=g,Pa.transition=y}}function Ad(n,s,o,u){if(hc){var g=Pd(n,s,o,u);if(g===null)$d(n,s,u,fc,o),Ym(n,u);else if(jy(g,n,s,o,u))u.stopPropagation();else if(Ym(n,u),s&4&&-1<Gy.indexOf(n)){for(;g!==null;){var y=dl(g);if(y!==null&&zt(y),y=Pd(n,s,o,u),y===null&&$d(n,s,u,fc,o),y===g)break;g=y}g!==null&&u.stopPropagation()}else $d(n,s,u,null,o)}}var fc=null;function Pd(n,s,o,u){if(fc=null,n=Je(u),n=$s(n),n!==null)if(s=Xn(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Aa(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return fc=n,null}function Jm(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Rd()){case qo:return 1;case P:return 4;case Z:case me:return 16;case le:return 536870912;default:return 16}default:return 16}}var ns=null,Nd=null,pc=null;function eg(){if(pc)return pc;var n,s=Nd,o=s.length,u,g="value"in ns?ns.value:ns.textContent,y=g.length;for(n=0;n<o&&s[n]===g[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===g[y-u];u++);return pc=g.slice(n,1<u?1-u:void 0)}function mc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function gc(){return!0}function tg(){return!1}function fi(n){function s(o,u,g,y,R){this._reactName=o,this._targetInst=g,this.type=u,this.nativeEvent=y,this.target=R,this.currentTarget=null;for(var B in n)n.hasOwnProperty(B)&&(o=n[B],this[B]=o?o(y):y[B]);return this.isDefaultPrevented=(y.defaultPrevented!=null?y.defaultPrevented:y.returnValue===!1)?gc:tg,this.isPropagationStopped=tg,this}return he(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=gc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=gc)},persist:function(){},isPersistent:gc}),s}var Na={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Ld=fi(Na),el=he({},Na,{view:0,detail:0}),qy=fi(el),Dd,Id,tl,xc=he({},el,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Fd,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==tl&&(tl&&n.type==="mousemove"?(Dd=n.screenX-tl.screenX,Id=n.screenY-tl.screenY):Id=Dd=0,tl=n),Dd)},movementY:function(n){return"movementY"in n?n.movementY:Id}}),ng=fi(xc),Ky=he({},xc,{dataTransfer:0}),Yy=fi(Ky),Qy=he({},el,{relatedTarget:0}),Ud=fi(Qy),Zy=he({},Na,{animationName:0,elapsedTime:0,pseudoElement:0}),Jy=fi(Zy),eS=he({},Na,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),tS=fi(eS),nS=he({},Na,{data:0}),ig=fi(nS),iS={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},rS={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},sS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function aS(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=sS[n])?!!s[n]:!1}function Fd(){return aS}var oS=he({},el,{key:function(n){if(n.key){var s=iS[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=mc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?rS[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Fd,charCode:function(n){return n.type==="keypress"?mc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?mc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),lS=fi(oS),cS=he({},xc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),rg=fi(cS),uS=he({},el,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Fd}),dS=fi(uS),hS=he({},Na,{propertyName:0,elapsedTime:0,pseudoElement:0}),fS=fi(hS),pS=he({},xc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),mS=fi(pS),gS=[9,13,27,32],kd=d&&"CompositionEvent"in window,nl=null;d&&"documentMode"in document&&(nl=document.documentMode);var xS=d&&"TextEvent"in window&&!nl,sg=d&&(!kd||nl&&8<nl&&11>=nl),ag=" ",og=!1;function lg(n,s){switch(n){case"keyup":return gS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function cg(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var La=!1;function vS(n,s){switch(n){case"compositionend":return cg(s);case"keypress":return s.which!==32?null:(og=!0,ag);case"textInput":return n=s.data,n===ag&&og?null:n;default:return null}}function _S(n,s){if(La)return n==="compositionend"||!kd&&lg(n,s)?(n=eg(),pc=Nd=ns=null,La=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return sg&&s.locale!=="ko"?null:s.data;default:return null}}var yS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ug(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!yS[n.type]:s==="textarea"}function dg(n,s,o,u){Se(u),s=Mc(s,"onChange"),0<s.length&&(o=new Ld("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var il=null,rl=null;function SS(n){Ag(n,0)}function vc(n){var s=ka(n);if(kt(s))return n}function MS(n,s){if(n==="change")return s}var hg=!1;if(d){var Od;if(d){var zd="oninput"in document;if(!zd){var fg=document.createElement("div");fg.setAttribute("oninput","return;"),zd=typeof fg.oninput=="function"}Od=zd}else Od=!1;hg=Od&&(!document.documentMode||9<document.documentMode)}function pg(){il&&(il.detachEvent("onpropertychange",mg),rl=il=null)}function mg(n){if(n.propertyName==="value"&&vc(rl)){var s=[];dg(s,rl,n,Je(n)),qe(SS,s)}}function ES(n,s,o){n==="focusin"?(pg(),il=s,rl=o,il.attachEvent("onpropertychange",mg)):n==="focusout"&&pg()}function wS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return vc(rl)}function bS(n,s){if(n==="click")return vc(s)}function TS(n,s){if(n==="input"||n==="change")return vc(s)}function CS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var Oi=typeof Object.is=="function"?Object.is:CS;function sl(n,s){if(Oi(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var g=o[u];if(!h.call(s,g)||!Oi(n[g],s[g]))return!1}return!0}function gg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function xg(n,s){var o=gg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=gg(o)}}function vg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?vg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function _g(){for(var n=window,s=ct();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=ct(n.document)}return s}function Bd(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function RS(n){var s=_g(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&vg(o.ownerDocument.documentElement,o)){if(u!==null&&Bd(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var g=o.textContent.length,y=Math.min(u.start,g);u=u.end===void 0?y:Math.min(u.end,g),!n.extend&&y>u&&(g=u,u=y,y=g),g=xg(o,y);var R=xg(o,u);g&&R&&(n.rangeCount!==1||n.anchorNode!==g.node||n.anchorOffset!==g.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(g.node,g.offset),n.removeAllRanges(),y>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var AS=d&&"documentMode"in document&&11>=document.documentMode,Da=null,Hd=null,al=null,Vd=!1;function yg(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Vd||Da==null||Da!==ct(u)||(u=Da,"selectionStart"in u&&Bd(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),al&&sl(al,u)||(al=u,u=Mc(Hd,"onSelect"),0<u.length&&(s=new Ld("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=Da)))}function _c(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var Ia={animationend:_c("Animation","AnimationEnd"),animationiteration:_c("Animation","AnimationIteration"),animationstart:_c("Animation","AnimationStart"),transitionend:_c("Transition","TransitionEnd")},Gd={},Sg={};d&&(Sg=document.createElement("div").style,"AnimationEvent"in window||(delete Ia.animationend.animation,delete Ia.animationiteration.animation,delete Ia.animationstart.animation),"TransitionEvent"in window||delete Ia.transitionend.transition);function yc(n){if(Gd[n])return Gd[n];if(!Ia[n])return n;var s=Ia[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in Sg)return Gd[n]=s[o];return n}var Mg=yc("animationend"),Eg=yc("animationiteration"),wg=yc("animationstart"),bg=yc("transitionend"),Tg=new Map,Cg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function is(n,s){Tg.set(n,s),l(s,[n])}for(var jd=0;jd<Cg.length;jd++){var Wd=Cg[jd],PS=Wd.toLowerCase(),NS=Wd[0].toUpperCase()+Wd.slice(1);is(PS,"on"+NS)}is(Mg,"onAnimationEnd"),is(Eg,"onAnimationIteration"),is(wg,"onAnimationStart"),is("dblclick","onDoubleClick"),is("focusin","onFocus"),is("focusout","onBlur"),is(bg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var ol="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),LS=new Set("cancel close invalid load scroll toggle".split(" ").concat(ol));function Rg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,lc(u,s,void 0,n),n.currentTarget=null}function Ag(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],g=u.event;u=u.listeners;e:{var y=void 0;if(s)for(var R=u.length-1;0<=R;R--){var B=u[R],X=B.instance,ge=B.currentTarget;if(B=B.listener,X!==y&&g.isPropagationStopped())break e;Rg(g,B,ge),y=X}else for(R=0;R<u.length;R++){if(B=u[R],X=B.instance,ge=B.currentTarget,B=B.listener,X!==y&&g.isPropagationStopped())break e;Rg(g,B,ge),y=X}}}if(Vs)throw n=Gs,Vs=!1,Gs=null,n}function en(n,s){var o=s[Jd];o===void 0&&(o=s[Jd]=new Set);var u=n+"__bubble";o.has(u)||(Pg(s,n,2,!1),o.add(u))}function Xd(n,s,o){var u=0;s&&(u|=4),Pg(o,n,u,s)}var Sc="_reactListening"+Math.random().toString(36).slice(2);function ll(n){if(!n[Sc]){n[Sc]=!0,r.forEach(function(o){o!=="selectionchange"&&(LS.has(o)||Xd(o,!1,n),Xd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[Sc]||(s[Sc]=!0,Xd("selectionchange",!1,s))}}function Pg(n,s,o,u){switch(Jm(s)){case 1:var g=Xy;break;case 4:g=$y;break;default:g=Ad}o=g.bind(null,s,o,n),g=void 0,!Ot||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(g=!0),u?g!==void 0?n.addEventListener(s,o,{capture:!0,passive:g}):n.addEventListener(s,o,!0):g!==void 0?n.addEventListener(s,o,{passive:g}):n.addEventListener(s,o,!1)}function $d(n,s,o,u,g){var y=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var B=u.stateNode.containerInfo;if(B===g||B.nodeType===8&&B.parentNode===g)break;if(R===4)for(R=u.return;R!==null;){var X=R.tag;if((X===3||X===4)&&(X=R.stateNode.containerInfo,X===g||X.nodeType===8&&X.parentNode===g))return;R=R.return}for(;B!==null;){if(R=$s(B),R===null)return;if(X=R.tag,X===5||X===6){u=y=R;continue e}B=B.parentNode}}u=u.return}qe(function(){var ge=y,we=Je(o),be=[];e:{var Ee=Tg.get(n);if(Ee!==void 0){var Ge=Ld,Ke=n;switch(n){case"keypress":if(mc(o)===0)break e;case"keydown":case"keyup":Ge=lS;break;case"focusin":Ke="focus",Ge=Ud;break;case"focusout":Ke="blur",Ge=Ud;break;case"beforeblur":case"afterblur":Ge=Ud;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":Ge=ng;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":Ge=Yy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":Ge=dS;break;case Mg:case Eg:case wg:Ge=Jy;break;case bg:Ge=fS;break;case"scroll":Ge=qy;break;case"wheel":Ge=mS;break;case"copy":case"cut":case"paste":Ge=tS;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":Ge=rg}var Ze=(s&4)!==0,pn=!Ze&&n==="scroll",se=Ze?Ee!==null?Ee+"Capture":null:Ee;Ze=[];for(var Y=ge,ce;Y!==null;){ce=Y;var Re=ce.stateNode;if(ce.tag===5&&Re!==null&&(ce=Re,se!==null&&(Re=Wt(Y,se),Re!=null&&Ze.push(cl(Y,Re,ce)))),pn)break;Y=Y.return}0<Ze.length&&(Ee=new Ge(Ee,Ke,null,o,we),be.push({event:Ee,listeners:Ze}))}}if((s&7)===0){e:{if(Ee=n==="mouseover"||n==="pointerover",Ge=n==="mouseout"||n==="pointerout",Ee&&o!==Ae&&(Ke=o.relatedTarget||o.fromElement)&&($s(Ke)||Ke[wr]))break e;if((Ge||Ee)&&(Ee=we.window===we?we:(Ee=we.ownerDocument)?Ee.defaultView||Ee.parentWindow:window,Ge?(Ke=o.relatedTarget||o.toElement,Ge=ge,Ke=Ke?$s(Ke):null,Ke!==null&&(pn=Xn(Ke),Ke!==pn||Ke.tag!==5&&Ke.tag!==6)&&(Ke=null)):(Ge=null,Ke=ge),Ge!==Ke)){if(Ze=ng,Re="onMouseLeave",se="onMouseEnter",Y="mouse",(n==="pointerout"||n==="pointerover")&&(Ze=rg,Re="onPointerLeave",se="onPointerEnter",Y="pointer"),pn=Ge==null?Ee:ka(Ge),ce=Ke==null?Ee:ka(Ke),Ee=new Ze(Re,Y+"leave",Ge,o,we),Ee.target=pn,Ee.relatedTarget=ce,Re=null,$s(we)===ge&&(Ze=new Ze(se,Y+"enter",Ke,o,we),Ze.target=ce,Ze.relatedTarget=pn,Re=Ze),pn=Re,Ge&&Ke)t:{for(Ze=Ge,se=Ke,Y=0,ce=Ze;ce;ce=Ua(ce))Y++;for(ce=0,Re=se;Re;Re=Ua(Re))ce++;for(;0<Y-ce;)Ze=Ua(Ze),Y--;for(;0<ce-Y;)se=Ua(se),ce--;for(;Y--;){if(Ze===se||se!==null&&Ze===se.alternate)break t;Ze=Ua(Ze),se=Ua(se)}Ze=null}else Ze=null;Ge!==null&&Ng(be,Ee,Ge,Ze,!1),Ke!==null&&pn!==null&&Ng(be,pn,Ke,Ze,!0)}}e:{if(Ee=ge?ka(ge):window,Ge=Ee.nodeName&&Ee.nodeName.toLowerCase(),Ge==="select"||Ge==="input"&&Ee.type==="file")var tt=MS;else if(ug(Ee))if(hg)tt=TS;else{tt=wS;var at=ES}else(Ge=Ee.nodeName)&&Ge.toLowerCase()==="input"&&(Ee.type==="checkbox"||Ee.type==="radio")&&(tt=bS);if(tt&&(tt=tt(n,ge))){dg(be,tt,o,we);break e}at&&at(n,Ee,ge),n==="focusout"&&(at=Ee._wrapperState)&&at.controlled&&Ee.type==="number"&&jt(Ee,"number",Ee.value)}switch(at=ge?ka(ge):window,n){case"focusin":(ug(at)||at.contentEditable==="true")&&(Da=at,Hd=ge,al=null);break;case"focusout":al=Hd=Da=null;break;case"mousedown":Vd=!0;break;case"contextmenu":case"mouseup":case"dragend":Vd=!1,yg(be,o,we);break;case"selectionchange":if(AS)break;case"keydown":case"keyup":yg(be,o,we)}var ot;if(kd)e:{switch(n){case"compositionstart":var ut="onCompositionStart";break e;case"compositionend":ut="onCompositionEnd";break e;case"compositionupdate":ut="onCompositionUpdate";break e}ut=void 0}else La?lg(n,o)&&(ut="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ut="onCompositionStart");ut&&(sg&&o.locale!=="ko"&&(La||ut!=="onCompositionStart"?ut==="onCompositionEnd"&&La&&(ot=eg()):(ns=we,Nd="value"in ns?ns.value:ns.textContent,La=!0)),at=Mc(ge,ut),0<at.length&&(ut=new ig(ut,n,null,o,we),be.push({event:ut,listeners:at}),ot?ut.data=ot:(ot=cg(o),ot!==null&&(ut.data=ot)))),(ot=xS?vS(n,o):_S(n,o))&&(ge=Mc(ge,"onBeforeInput"),0<ge.length&&(we=new ig("onBeforeInput","beforeinput",null,o,we),be.push({event:we,listeners:ge}),we.data=ot))}Ag(be,s)})}function cl(n,s,o){return{instance:n,listener:s,currentTarget:o}}function Mc(n,s){for(var o=s+"Capture",u=[];n!==null;){var g=n,y=g.stateNode;g.tag===5&&y!==null&&(g=y,y=Wt(n,o),y!=null&&u.unshift(cl(n,y,g)),y=Wt(n,s),y!=null&&u.push(cl(n,y,g))),n=n.return}return u}function Ua(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Ng(n,s,o,u,g){for(var y=s._reactName,R=[];o!==null&&o!==u;){var B=o,X=B.alternate,ge=B.stateNode;if(X!==null&&X===u)break;B.tag===5&&ge!==null&&(B=ge,g?(X=Wt(o,y),X!=null&&R.unshift(cl(o,X,B))):g||(X=Wt(o,y),X!=null&&R.push(cl(o,X,B)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var DS=/\r\n?/g,IS=/\u0000|\uFFFD/g;function Lg(n){return(typeof n=="string"?n:""+n).replace(DS,`
`).replace(IS,"")}function Ec(n,s,o){if(s=Lg(s),Lg(n)!==s&&o)throw Error(t(425))}function wc(){}var qd=null,Kd=null;function Yd(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var Qd=typeof setTimeout=="function"?setTimeout:void 0,US=typeof clearTimeout=="function"?clearTimeout:void 0,Dg=typeof Promise=="function"?Promise:void 0,FS=typeof queueMicrotask=="function"?queueMicrotask:typeof Dg<"u"?function(n){return Dg.resolve(null).then(n).catch(kS)}:Qd;function kS(n){setTimeout(function(){throw n})}function Zd(n,s){var o=s,u=0;do{var g=o.nextSibling;if(n.removeChild(o),g&&g.nodeType===8)if(o=g.data,o==="/$"){if(u===0){n.removeChild(g),Jo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=g}while(o);Jo(s)}function rs(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Ig(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var Fa=Math.random().toString(36).slice(2),tr="__reactFiber$"+Fa,ul="__reactProps$"+Fa,wr="__reactContainer$"+Fa,Jd="__reactEvents$"+Fa,OS="__reactListeners$"+Fa,zS="__reactHandles$"+Fa;function $s(n){var s=n[tr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[wr]||o[tr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Ig(n);n!==null;){if(o=n[tr])return o;n=Ig(n)}return s}n=o,o=n.parentNode}return null}function dl(n){return n=n[tr]||n[wr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function ka(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function bc(n){return n[ul]||null}var eh=[],Oa=-1;function ss(n){return{current:n}}function tn(n){0>Oa||(n.current=eh[Oa],eh[Oa]=null,Oa--)}function Zt(n,s){Oa++,eh[Oa]=n.current,n.current=s}var as={},kn=ss(as),ni=ss(!1),qs=as;function za(n,s){var o=n.type.contextTypes;if(!o)return as;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var g={},y;for(y in o)g[y]=s[y];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=g),g}function ii(n){return n=n.childContextTypes,n!=null}function Tc(){tn(ni),tn(kn)}function Ug(n,s,o){if(kn.current!==as)throw Error(t(168));Zt(kn,s),Zt(ni,o)}function Fg(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var g in u)if(!(g in s))throw Error(t(108,ve(n)||"Unknown",g));return he({},o,u)}function Cc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||as,qs=kn.current,Zt(kn,n),Zt(ni,ni.current),!0}function kg(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Fg(n,s,qs),u.__reactInternalMemoizedMergedChildContext=n,tn(ni),tn(kn),Zt(kn,n)):tn(ni),Zt(ni,o)}var br=null,Rc=!1,th=!1;function Og(n){br===null?br=[n]:br.push(n)}function BS(n){Rc=!0,Og(n)}function os(){if(!th&&br!==null){th=!0;var n=0,s=Mt;try{var o=br;for(Mt=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}br=null,Rc=!1}catch(g){throw br!==null&&(br=br.slice(n+1)),Ws(qo,os),g}finally{Mt=s,th=!1}}return null}var Ba=[],Ha=0,Ac=null,Pc=0,bi=[],Ti=0,Ks=null,Tr=1,Cr="";function Ys(n,s){Ba[Ha++]=Pc,Ba[Ha++]=Ac,Ac=n,Pc=s}function zg(n,s,o){bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=Ks,Ks=n;var u=Tr;n=Cr;var g=32-Pe(u)-1;u&=~(1<<g),o+=1;var y=32-Pe(s)+g;if(30<y){var R=g-g%5;y=(u&(1<<R)-1).toString(32),u>>=R,g-=R,Tr=1<<32-Pe(s)+g|o<<g|u,Cr=y+n}else Tr=1<<y|o<<g|u,Cr=n}function nh(n){n.return!==null&&(Ys(n,1),zg(n,1,0))}function ih(n){for(;n===Ac;)Ac=Ba[--Ha],Ba[Ha]=null,Pc=Ba[--Ha],Ba[Ha]=null;for(;n===Ks;)Ks=bi[--Ti],bi[Ti]=null,Cr=bi[--Ti],bi[Ti]=null,Tr=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,sn=!1,zi=null;function Bg(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Hg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=rs(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=Ks!==null?{id:Tr,overflow:Cr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function rh(n){return(n.mode&1)!==0&&(n.flags&128)===0}function sh(n){if(sn){var s=mi;if(s){var o=s;if(!Hg(n,s)){if(rh(n))throw Error(t(418));s=rs(o.nextSibling);var u=pi;s&&Hg(n,s)?Bg(u,o):(n.flags=n.flags&-4097|2,sn=!1,pi=n)}}else{if(rh(n))throw Error(t(418));n.flags=n.flags&-4097|2,sn=!1,pi=n}}}function Vg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Nc(n){if(n!==pi)return!1;if(!sn)return Vg(n),sn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!Yd(n.type,n.memoizedProps)),s&&(s=mi)){if(rh(n))throw Gg(),Error(t(418));for(;s;)Bg(n,s),s=rs(s.nextSibling)}if(Vg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=rs(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?rs(n.stateNode.nextSibling):null;return!0}function Gg(){for(var n=mi;n;)n=rs(n.nextSibling)}function Va(){mi=pi=null,sn=!1}function ah(n){zi===null?zi=[n]:zi.push(n)}var HS=C.ReactCurrentBatchConfig;function hl(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var g=u,y=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===y?s.ref:(s=function(R){var B=g.refs;R===null?delete B[y]:B[y]=R},s._stringRef=y,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Lc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function jg(n){var s=n._init;return s(n._payload)}function Wg(n){function s(se,Y){if(n){var ce=se.deletions;ce===null?(se.deletions=[Y],se.flags|=16):ce.push(Y)}}function o(se,Y){if(!n)return null;for(;Y!==null;)s(se,Y),Y=Y.sibling;return null}function u(se,Y){for(se=new Map;Y!==null;)Y.key!==null?se.set(Y.key,Y):se.set(Y.index,Y),Y=Y.sibling;return se}function g(se,Y){return se=ms(se,Y),se.index=0,se.sibling=null,se}function y(se,Y,ce){return se.index=ce,n?(ce=se.alternate,ce!==null?(ce=ce.index,ce<Y?(se.flags|=2,Y):ce):(se.flags|=2,Y)):(se.flags|=1048576,Y)}function R(se){return n&&se.alternate===null&&(se.flags|=2),se}function B(se,Y,ce,Re){return Y===null||Y.tag!==6?(Y=Qh(ce,se.mode,Re),Y.return=se,Y):(Y=g(Y,ce),Y.return=se,Y)}function X(se,Y,ce,Re){var tt=ce.type;return tt===U?we(se,Y,ce.props.children,Re,ce.key):Y!==null&&(Y.elementType===tt||typeof tt=="object"&&tt!==null&&tt.$$typeof===pe&&jg(tt)===Y.type)?(Re=g(Y,ce.props),Re.ref=hl(se,Y,ce),Re.return=se,Re):(Re=nu(ce.type,ce.key,ce.props,null,se.mode,Re),Re.ref=hl(se,Y,ce),Re.return=se,Re)}function ge(se,Y,ce,Re){return Y===null||Y.tag!==4||Y.stateNode.containerInfo!==ce.containerInfo||Y.stateNode.implementation!==ce.implementation?(Y=Zh(ce,se.mode,Re),Y.return=se,Y):(Y=g(Y,ce.children||[]),Y.return=se,Y)}function we(se,Y,ce,Re,tt){return Y===null||Y.tag!==7?(Y=ra(ce,se.mode,Re,tt),Y.return=se,Y):(Y=g(Y,ce),Y.return=se,Y)}function be(se,Y,ce){if(typeof Y=="string"&&Y!==""||typeof Y=="number")return Y=Qh(""+Y,se.mode,ce),Y.return=se,Y;if(typeof Y=="object"&&Y!==null){switch(Y.$$typeof){case I:return ce=nu(Y.type,Y.key,Y.props,null,se.mode,ce),ce.ref=hl(se,null,Y),ce.return=se,ce;case N:return Y=Zh(Y,se.mode,ce),Y.return=se,Y;case pe:var Re=Y._init;return be(se,Re(Y._payload),ce)}if(Kt(Y)||re(Y))return Y=ra(Y,se.mode,ce,null),Y.return=se,Y;Lc(se,Y)}return null}function Ee(se,Y,ce,Re){var tt=Y!==null?Y.key:null;if(typeof ce=="string"&&ce!==""||typeof ce=="number")return tt!==null?null:B(se,Y,""+ce,Re);if(typeof ce=="object"&&ce!==null){switch(ce.$$typeof){case I:return ce.key===tt?X(se,Y,ce,Re):null;case N:return ce.key===tt?ge(se,Y,ce,Re):null;case pe:return tt=ce._init,Ee(se,Y,tt(ce._payload),Re)}if(Kt(ce)||re(ce))return tt!==null?null:we(se,Y,ce,Re,null);Lc(se,ce)}return null}function Ge(se,Y,ce,Re,tt){if(typeof Re=="string"&&Re!==""||typeof Re=="number")return se=se.get(ce)||null,B(Y,se,""+Re,tt);if(typeof Re=="object"&&Re!==null){switch(Re.$$typeof){case I:return se=se.get(Re.key===null?ce:Re.key)||null,X(Y,se,Re,tt);case N:return se=se.get(Re.key===null?ce:Re.key)||null,ge(Y,se,Re,tt);case pe:var at=Re._init;return Ge(se,Y,ce,at(Re._payload),tt)}if(Kt(Re)||re(Re))return se=se.get(ce)||null,we(Y,se,Re,tt,null);Lc(Y,Re)}return null}function Ke(se,Y,ce,Re){for(var tt=null,at=null,ot=Y,ut=Y=0,Rn=null;ot!==null&&ut<ce.length;ut++){ot.index>ut?(Rn=ot,ot=null):Rn=ot.sibling;var Ut=Ee(se,ot,ce[ut],Re);if(Ut===null){ot===null&&(ot=Rn);break}n&&ot&&Ut.alternate===null&&s(se,ot),Y=y(Ut,Y,ut),at===null?tt=Ut:at.sibling=Ut,at=Ut,ot=Rn}if(ut===ce.length)return o(se,ot),sn&&Ys(se,ut),tt;if(ot===null){for(;ut<ce.length;ut++)ot=be(se,ce[ut],Re),ot!==null&&(Y=y(ot,Y,ut),at===null?tt=ot:at.sibling=ot,at=ot);return sn&&Ys(se,ut),tt}for(ot=u(se,ot);ut<ce.length;ut++)Rn=Ge(ot,se,ut,ce[ut],Re),Rn!==null&&(n&&Rn.alternate!==null&&ot.delete(Rn.key===null?ut:Rn.key),Y=y(Rn,Y,ut),at===null?tt=Rn:at.sibling=Rn,at=Rn);return n&&ot.forEach(function(gs){return s(se,gs)}),sn&&Ys(se,ut),tt}function Ze(se,Y,ce,Re){var tt=re(ce);if(typeof tt!="function")throw Error(t(150));if(ce=tt.call(ce),ce==null)throw Error(t(151));for(var at=tt=null,ot=Y,ut=Y=0,Rn=null,Ut=ce.next();ot!==null&&!Ut.done;ut++,Ut=ce.next()){ot.index>ut?(Rn=ot,ot=null):Rn=ot.sibling;var gs=Ee(se,ot,Ut.value,Re);if(gs===null){ot===null&&(ot=Rn);break}n&&ot&&gs.alternate===null&&s(se,ot),Y=y(gs,Y,ut),at===null?tt=gs:at.sibling=gs,at=gs,ot=Rn}if(Ut.done)return o(se,ot),sn&&Ys(se,ut),tt;if(ot===null){for(;!Ut.done;ut++,Ut=ce.next())Ut=be(se,Ut.value,Re),Ut!==null&&(Y=y(Ut,Y,ut),at===null?tt=Ut:at.sibling=Ut,at=Ut);return sn&&Ys(se,ut),tt}for(ot=u(se,ot);!Ut.done;ut++,Ut=ce.next())Ut=Ge(ot,se,ut,Ut.value,Re),Ut!==null&&(n&&Ut.alternate!==null&&ot.delete(Ut.key===null?ut:Ut.key),Y=y(Ut,Y,ut),at===null?tt=Ut:at.sibling=Ut,at=Ut);return n&&ot.forEach(function(yM){return s(se,yM)}),sn&&Ys(se,ut),tt}function pn(se,Y,ce,Re){if(typeof ce=="object"&&ce!==null&&ce.type===U&&ce.key===null&&(ce=ce.props.children),typeof ce=="object"&&ce!==null){switch(ce.$$typeof){case I:e:{for(var tt=ce.key,at=Y;at!==null;){if(at.key===tt){if(tt=ce.type,tt===U){if(at.tag===7){o(se,at.sibling),Y=g(at,ce.props.children),Y.return=se,se=Y;break e}}else if(at.elementType===tt||typeof tt=="object"&&tt!==null&&tt.$$typeof===pe&&jg(tt)===at.type){o(se,at.sibling),Y=g(at,ce.props),Y.ref=hl(se,at,ce),Y.return=se,se=Y;break e}o(se,at);break}else s(se,at);at=at.sibling}ce.type===U?(Y=ra(ce.props.children,se.mode,Re,ce.key),Y.return=se,se=Y):(Re=nu(ce.type,ce.key,ce.props,null,se.mode,Re),Re.ref=hl(se,Y,ce),Re.return=se,se=Re)}return R(se);case N:e:{for(at=ce.key;Y!==null;){if(Y.key===at)if(Y.tag===4&&Y.stateNode.containerInfo===ce.containerInfo&&Y.stateNode.implementation===ce.implementation){o(se,Y.sibling),Y=g(Y,ce.children||[]),Y.return=se,se=Y;break e}else{o(se,Y);break}else s(se,Y);Y=Y.sibling}Y=Zh(ce,se.mode,Re),Y.return=se,se=Y}return R(se);case pe:return at=ce._init,pn(se,Y,at(ce._payload),Re)}if(Kt(ce))return Ke(se,Y,ce,Re);if(re(ce))return Ze(se,Y,ce,Re);Lc(se,ce)}return typeof ce=="string"&&ce!==""||typeof ce=="number"?(ce=""+ce,Y!==null&&Y.tag===6?(o(se,Y.sibling),Y=g(Y,ce),Y.return=se,se=Y):(o(se,Y),Y=Qh(ce,se.mode,Re),Y.return=se,se=Y),R(se)):o(se,Y)}return pn}var Ga=Wg(!0),Xg=Wg(!1),Dc=ss(null),Ic=null,ja=null,oh=null;function lh(){oh=ja=Ic=null}function ch(n){var s=Dc.current;tn(Dc),n._currentValue=s}function uh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function Wa(n,s){Ic=n,oh=ja=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ri=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(oh!==n)if(n={context:n,memoizedValue:s,next:null},ja===null){if(Ic===null)throw Error(t(308));ja=n,Ic.dependencies={lanes:0,firstContext:n}}else ja=ja.next=n;return s}var Qs=null;function dh(n){Qs===null?Qs=[n]:Qs.push(n)}function $g(n,s,o,u){var g=s.interleaved;return g===null?(o.next=o,dh(s)):(o.next=g.next,g.next=o),s.interleaved=o,Rr(n,u)}function Rr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var ls=!1;function hh(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function qg(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Ar(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function cs(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(Lt&2)!==0){var g=u.pending;return g===null?s.next=s:(s.next=g.next,g.next=s),u.pending=s,Rr(n,o)}return g=u.interleaved,g===null?(s.next=s,dh(u)):(s.next=g.next,g.next=s),u.interleaved=s,Rr(n,o)}function Uc(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}function Kg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var g=null,y=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};y===null?g=y=R:y=y.next=R,o=o.next}while(o!==null);y===null?g=y=s:y=y.next=s}else g=y=s;o={baseState:u.baseState,firstBaseUpdate:g,lastBaseUpdate:y,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Fc(n,s,o,u){var g=n.updateQueue;ls=!1;var y=g.firstBaseUpdate,R=g.lastBaseUpdate,B=g.shared.pending;if(B!==null){g.shared.pending=null;var X=B,ge=X.next;X.next=null,R===null?y=ge:R.next=ge,R=X;var we=n.alternate;we!==null&&(we=we.updateQueue,B=we.lastBaseUpdate,B!==R&&(B===null?we.firstBaseUpdate=ge:B.next=ge,we.lastBaseUpdate=X))}if(y!==null){var be=g.baseState;R=0,we=ge=X=null,B=y;do{var Ee=B.lane,Ge=B.eventTime;if((u&Ee)===Ee){we!==null&&(we=we.next={eventTime:Ge,lane:0,tag:B.tag,payload:B.payload,callback:B.callback,next:null});e:{var Ke=n,Ze=B;switch(Ee=s,Ge=o,Ze.tag){case 1:if(Ke=Ze.payload,typeof Ke=="function"){be=Ke.call(Ge,be,Ee);break e}be=Ke;break e;case 3:Ke.flags=Ke.flags&-65537|128;case 0:if(Ke=Ze.payload,Ee=typeof Ke=="function"?Ke.call(Ge,be,Ee):Ke,Ee==null)break e;be=he({},be,Ee);break e;case 2:ls=!0}}B.callback!==null&&B.lane!==0&&(n.flags|=64,Ee=g.effects,Ee===null?g.effects=[B]:Ee.push(B))}else Ge={eventTime:Ge,lane:Ee,tag:B.tag,payload:B.payload,callback:B.callback,next:null},we===null?(ge=we=Ge,X=be):we=we.next=Ge,R|=Ee;if(B=B.next,B===null){if(B=g.shared.pending,B===null)break;Ee=B,B=Ee.next,Ee.next=null,g.lastBaseUpdate=Ee,g.shared.pending=null}}while(!0);if(we===null&&(X=be),g.baseState=X,g.firstBaseUpdate=ge,g.lastBaseUpdate=we,s=g.shared.interleaved,s!==null){g=s;do R|=g.lane,g=g.next;while(g!==s)}else y===null&&(g.shared.lanes=0);ea|=R,n.lanes=R,n.memoizedState=be}}function Yg(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],g=u.callback;if(g!==null){if(u.callback=null,u=o,typeof g!="function")throw Error(t(191,g));g.call(u)}}}var fl={},nr=ss(fl),pl=ss(fl),ml=ss(fl);function Zs(n){if(n===fl)throw Error(t(174));return n}function fh(n,s){switch(Zt(ml,s),Zt(pl,n),Zt(nr,fl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}tn(nr),Zt(nr,s)}function Xa(){tn(nr),tn(pl),tn(ml)}function Qg(n){Zs(ml.current);var s=Zs(nr.current),o=T(s,n.type);s!==o&&(Zt(pl,n),Zt(nr,o))}function ph(n){pl.current===n&&(tn(nr),tn(pl))}var cn=ss(0);function kc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var mh=[];function gh(){for(var n=0;n<mh.length;n++)mh[n]._workInProgressVersionPrimary=null;mh.length=0}var Oc=C.ReactCurrentDispatcher,xh=C.ReactCurrentBatchConfig,Js=0,un=null,_n=null,Tn=null,zc=!1,gl=!1,xl=0,VS=0;function On(){throw Error(t(321))}function vh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!Oi(n[o],s[o]))return!1;return!0}function _h(n,s,o,u,g,y){if(Js=y,un=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,Oc.current=n===null||n.memoizedState===null?XS:$S,n=o(u,g),gl){y=0;do{if(gl=!1,xl=0,25<=y)throw Error(t(301));y+=1,Tn=_n=null,s.updateQueue=null,Oc.current=qS,n=o(u,g)}while(gl)}if(Oc.current=Vc,s=_n!==null&&_n.next!==null,Js=0,Tn=_n=un=null,zc=!1,s)throw Error(t(300));return n}function yh(){var n=xl!==0;return xl=0,n}function ir(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return Tn===null?un.memoizedState=Tn=n:Tn=Tn.next=n,Tn}function Ri(){if(_n===null){var n=un.alternate;n=n!==null?n.memoizedState:null}else n=_n.next;var s=Tn===null?un.memoizedState:Tn.next;if(s!==null)Tn=s,_n=n;else{if(n===null)throw Error(t(310));_n=n,n={memoizedState:_n.memoizedState,baseState:_n.baseState,baseQueue:_n.baseQueue,queue:_n.queue,next:null},Tn===null?un.memoizedState=Tn=n:Tn=Tn.next=n}return Tn}function vl(n,s){return typeof s=="function"?s(n):s}function Sh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=_n,g=u.baseQueue,y=o.pending;if(y!==null){if(g!==null){var R=g.next;g.next=y.next,y.next=R}u.baseQueue=g=y,o.pending=null}if(g!==null){y=g.next,u=u.baseState;var B=R=null,X=null,ge=y;do{var we=ge.lane;if((Js&we)===we)X!==null&&(X=X.next={lane:0,action:ge.action,hasEagerState:ge.hasEagerState,eagerState:ge.eagerState,next:null}),u=ge.hasEagerState?ge.eagerState:n(u,ge.action);else{var be={lane:we,action:ge.action,hasEagerState:ge.hasEagerState,eagerState:ge.eagerState,next:null};X===null?(B=X=be,R=u):X=X.next=be,un.lanes|=we,ea|=we}ge=ge.next}while(ge!==null&&ge!==y);X===null?R=u:X.next=B,Oi(u,s.memoizedState)||(ri=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=X,o.lastRenderedState=u}if(n=o.interleaved,n!==null){g=n;do y=g.lane,un.lanes|=y,ea|=y,g=g.next;while(g!==n)}else g===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function Mh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,g=o.pending,y=s.memoizedState;if(g!==null){o.pending=null;var R=g=g.next;do y=n(y,R.action),R=R.next;while(R!==g);Oi(y,s.memoizedState)||(ri=!0),s.memoizedState=y,s.baseQueue===null&&(s.baseState=y),o.lastRenderedState=y}return[y,u]}function Zg(){}function Jg(n,s){var o=un,u=Ri(),g=s(),y=!Oi(u.memoizedState,g);if(y&&(u.memoizedState=g,ri=!0),u=u.queue,Eh(n0.bind(null,o,u,n),[n]),u.getSnapshot!==s||y||Tn!==null&&Tn.memoizedState.tag&1){if(o.flags|=2048,_l(9,t0.bind(null,o,u,g,s),void 0,null),Cn===null)throw Error(t(349));(Js&30)!==0||e0(o,s,g)}return g}function e0(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=un.updateQueue,s===null?(s={lastEffect:null,stores:null},un.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function t0(n,s,o,u){s.value=o,s.getSnapshot=u,i0(s)&&r0(n)}function n0(n,s,o){return o(function(){i0(s)&&r0(n)})}function i0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!Oi(n,o)}catch{return!0}}function r0(n){var s=Rr(n,1);s!==null&&Gi(s,n,1,-1)}function s0(n){var s=ir();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:vl,lastRenderedState:n},s.queue=n,n=n.dispatch=WS.bind(null,un,n),[s.memoizedState,n]}function _l(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=un.updateQueue,s===null?(s={lastEffect:null,stores:null},un.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function a0(){return Ri().memoizedState}function Bc(n,s,o,u){var g=ir();un.flags|=n,g.memoizedState=_l(1|s,o,void 0,u===void 0?null:u)}function Hc(n,s,o,u){var g=Ri();u=u===void 0?null:u;var y=void 0;if(_n!==null){var R=_n.memoizedState;if(y=R.destroy,u!==null&&vh(u,R.deps)){g.memoizedState=_l(s,o,y,u);return}}un.flags|=n,g.memoizedState=_l(1|s,o,y,u)}function o0(n,s){return Bc(8390656,8,n,s)}function Eh(n,s){return Hc(2048,8,n,s)}function l0(n,s){return Hc(4,2,n,s)}function c0(n,s){return Hc(4,4,n,s)}function u0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function d0(n,s,o){return o=o!=null?o.concat([n]):null,Hc(4,4,u0.bind(null,s,n),o)}function wh(){}function h0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&vh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function f0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&vh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function p0(n,s,o){return(Js&21)===0?(n.baseState&&(n.baseState=!1,ri=!0),n.memoizedState=o):(Oi(o,s)||(o=Ve(),un.lanes|=o,ea|=o,n.baseState=!0),s)}function GS(n,s){var o=Mt;Mt=o!==0&&4>o?o:4,n(!0);var u=xh.transition;xh.transition={};try{n(!1),s()}finally{Mt=o,xh.transition=u}}function m0(){return Ri().memoizedState}function jS(n,s,o){var u=fs(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},g0(n))x0(s,o);else if(o=$g(n,s,o,u),o!==null){var g=qn();Gi(o,n,u,g),v0(o,s,u)}}function WS(n,s,o){var u=fs(n),g={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(g0(n))x0(s,g);else{var y=n.alternate;if(n.lanes===0&&(y===null||y.lanes===0)&&(y=s.lastRenderedReducer,y!==null))try{var R=s.lastRenderedState,B=y(R,o);if(g.hasEagerState=!0,g.eagerState=B,Oi(B,R)){var X=s.interleaved;X===null?(g.next=g,dh(s)):(g.next=X.next,X.next=g),s.interleaved=g;return}}catch{}finally{}o=$g(n,s,g,u),o!==null&&(g=qn(),Gi(o,n,u,g),v0(o,s,u))}}function g0(n){var s=n.alternate;return n===un||s!==null&&s===un}function x0(n,s){gl=zc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function v0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}var Vc={readContext:Ci,useCallback:On,useContext:On,useEffect:On,useImperativeHandle:On,useInsertionEffect:On,useLayoutEffect:On,useMemo:On,useReducer:On,useRef:On,useState:On,useDebugValue:On,useDeferredValue:On,useTransition:On,useMutableSource:On,useSyncExternalStore:On,useId:On,unstable_isNewReconciler:!1},XS={readContext:Ci,useCallback:function(n,s){return ir().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:o0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,Bc(4194308,4,u0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return Bc(4194308,4,n,s)},useInsertionEffect:function(n,s){return Bc(4,2,n,s)},useMemo:function(n,s){var o=ir();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=ir();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=jS.bind(null,un,n),[u.memoizedState,n]},useRef:function(n){var s=ir();return n={current:n},s.memoizedState=n},useState:s0,useDebugValue:wh,useDeferredValue:function(n){return ir().memoizedState=n},useTransition:function(){var n=s0(!1),s=n[0];return n=GS.bind(null,n[1]),ir().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=un,g=ir();if(sn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Cn===null)throw Error(t(349));(Js&30)!==0||e0(u,s,o)}g.memoizedState=o;var y={value:o,getSnapshot:s};return g.queue=y,o0(n0.bind(null,u,y,n),[n]),u.flags|=2048,_l(9,t0.bind(null,u,y,o,s),void 0,null),o},useId:function(){var n=ir(),s=Cn.identifierPrefix;if(sn){var o=Cr,u=Tr;o=(u&~(1<<32-Pe(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=xl++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=VS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},$S={readContext:Ci,useCallback:h0,useContext:Ci,useEffect:Eh,useImperativeHandle:d0,useInsertionEffect:l0,useLayoutEffect:c0,useMemo:f0,useReducer:Sh,useRef:a0,useState:function(){return Sh(vl)},useDebugValue:wh,useDeferredValue:function(n){var s=Ri();return p0(s,_n.memoizedState,n)},useTransition:function(){var n=Sh(vl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Zg,useSyncExternalStore:Jg,useId:m0,unstable_isNewReconciler:!1},qS={readContext:Ci,useCallback:h0,useContext:Ci,useEffect:Eh,useImperativeHandle:d0,useInsertionEffect:l0,useLayoutEffect:c0,useMemo:f0,useReducer:Mh,useRef:a0,useState:function(){return Mh(vl)},useDebugValue:wh,useDeferredValue:function(n){var s=Ri();return _n===null?s.memoizedState=n:p0(s,_n.memoizedState,n)},useTransition:function(){var n=Mh(vl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Zg,useSyncExternalStore:Jg,useId:m0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=he({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function bh(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:he({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Gc={isMounted:function(n){return(n=n._reactInternals)?Xn(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=qn(),g=fs(n),y=Ar(u,g);y.payload=s,o!=null&&(y.callback=o),s=cs(n,y,g),s!==null&&(Gi(s,n,g,u),Uc(s,n,g))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=qn(),g=fs(n),y=Ar(u,g);y.tag=1,y.payload=s,o!=null&&(y.callback=o),s=cs(n,y,g),s!==null&&(Gi(s,n,g,u),Uc(s,n,g))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=qn(),u=fs(n),g=Ar(o,u);g.tag=2,s!=null&&(g.callback=s),s=cs(n,g,u),s!==null&&(Gi(s,n,u,o),Uc(s,n,u))}};function _0(n,s,o,u,g,y,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,y,R):s.prototype&&s.prototype.isPureReactComponent?!sl(o,u)||!sl(g,y):!0}function y0(n,s,o){var u=!1,g=as,y=s.contextType;return typeof y=="object"&&y!==null?y=Ci(y):(g=ii(s)?qs:kn.current,u=s.contextTypes,y=(u=u!=null)?za(n,g):as),s=new s(o,y),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Gc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=g,n.__reactInternalMemoizedMaskedChildContext=y),s}function S0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Gc.enqueueReplaceState(s,s.state,null)}function Th(n,s,o,u){var g=n.stateNode;g.props=o,g.state=n.memoizedState,g.refs={},hh(n);var y=s.contextType;typeof y=="object"&&y!==null?g.context=Ci(y):(y=ii(s)?qs:kn.current,g.context=za(n,y)),g.state=n.memoizedState,y=s.getDerivedStateFromProps,typeof y=="function"&&(bh(n,s,y,o),g.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof g.getSnapshotBeforeUpdate=="function"||typeof g.UNSAFE_componentWillMount!="function"&&typeof g.componentWillMount!="function"||(s=g.state,typeof g.componentWillMount=="function"&&g.componentWillMount(),typeof g.UNSAFE_componentWillMount=="function"&&g.UNSAFE_componentWillMount(),s!==g.state&&Gc.enqueueReplaceState(g,g.state,null),Fc(n,o,g,u),g.state=n.memoizedState),typeof g.componentDidMount=="function"&&(n.flags|=4194308)}function $a(n,s){try{var o="",u=s;do o+=He(u),u=u.return;while(u);var g=o}catch(y){g=`
Error generating stack: `+y.message+`
`+y.stack}return{value:n,source:s,stack:g,digest:null}}function Ch(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Rh(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var KS=typeof WeakMap=="function"?WeakMap:Map;function M0(n,s,o){o=Ar(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){Yc||(Yc=!0,Gh=u),Rh(n,s)},o}function E0(n,s,o){o=Ar(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var g=s.value;o.payload=function(){return u(g)},o.callback=function(){Rh(n,s)}}var y=n.stateNode;return y!==null&&typeof y.componentDidCatch=="function"&&(o.callback=function(){Rh(n,s),typeof u!="function"&&(ds===null?ds=new Set([this]):ds.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function w0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new KS;var g=new Set;u.set(s,g)}else g=u.get(s),g===void 0&&(g=new Set,u.set(s,g));g.has(o)||(g.add(o),n=cM.bind(null,n,s,o),s.then(n,n))}function b0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function T0(n,s,o,u,g){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Ar(-1,1),s.tag=2,cs(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=g,n)}var YS=C.ReactCurrentOwner,ri=!1;function $n(n,s,o,u){s.child=n===null?Xg(s,null,o,u):Ga(s,n.child,o,u)}function C0(n,s,o,u,g){o=o.render;var y=s.ref;return Wa(s,g),u=_h(n,s,o,u,y,g),o=yh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~g,Pr(n,s,g)):(sn&&o&&nh(s),s.flags|=1,$n(n,s,u,g),s.child)}function R0(n,s,o,u,g){if(n===null){var y=o.type;return typeof y=="function"&&!Yh(y)&&y.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=y,A0(n,s,y,u,g)):(n=nu(o.type,null,u,s,s.mode,g),n.ref=s.ref,n.return=s,s.child=n)}if(y=n.child,(n.lanes&g)===0){var R=y.memoizedProps;if(o=o.compare,o=o!==null?o:sl,o(R,u)&&n.ref===s.ref)return Pr(n,s,g)}return s.flags|=1,n=ms(y,u),n.ref=s.ref,n.return=s,s.child=n}function A0(n,s,o,u,g){if(n!==null){var y=n.memoizedProps;if(sl(y,u)&&n.ref===s.ref)if(ri=!1,s.pendingProps=u=y,(n.lanes&g)!==0)(n.flags&131072)!==0&&(ri=!0);else return s.lanes=n.lanes,Pr(n,s,g)}return Ah(n,s,o,u,g)}function P0(n,s,o){var u=s.pendingProps,g=u.children,y=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},Zt(Ka,gi),gi|=o;else{if((o&1073741824)===0)return n=y!==null?y.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,Zt(Ka,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=y!==null?y.baseLanes:o,Zt(Ka,gi),gi|=u}else y!==null?(u=y.baseLanes|o,s.memoizedState=null):u=o,Zt(Ka,gi),gi|=u;return $n(n,s,g,o),s.child}function N0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Ah(n,s,o,u,g){var y=ii(o)?qs:kn.current;return y=za(s,y),Wa(s,g),o=_h(n,s,o,u,y,g),u=yh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~g,Pr(n,s,g)):(sn&&u&&nh(s),s.flags|=1,$n(n,s,o,g),s.child)}function L0(n,s,o,u,g){if(ii(o)){var y=!0;Cc(s)}else y=!1;if(Wa(s,g),s.stateNode===null)Wc(n,s),y0(s,o,u),Th(s,o,u,g),u=!0;else if(n===null){var R=s.stateNode,B=s.memoizedProps;R.props=B;var X=R.context,ge=o.contextType;typeof ge=="object"&&ge!==null?ge=Ci(ge):(ge=ii(o)?qs:kn.current,ge=za(s,ge));var we=o.getDerivedStateFromProps,be=typeof we=="function"||typeof R.getSnapshotBeforeUpdate=="function";be||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==u||X!==ge)&&S0(s,R,u,ge),ls=!1;var Ee=s.memoizedState;R.state=Ee,Fc(s,u,R,g),X=s.memoizedState,B!==u||Ee!==X||ni.current||ls?(typeof we=="function"&&(bh(s,o,we,u),X=s.memoizedState),(B=ls||_0(s,o,B,u,Ee,X,ge))?(be||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=X),R.props=u,R.state=X,R.context=ge,u=B):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,qg(n,s),B=s.memoizedProps,ge=s.type===s.elementType?B:Bi(s.type,B),R.props=ge,be=s.pendingProps,Ee=R.context,X=o.contextType,typeof X=="object"&&X!==null?X=Ci(X):(X=ii(o)?qs:kn.current,X=za(s,X));var Ge=o.getDerivedStateFromProps;(we=typeof Ge=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==be||Ee!==X)&&S0(s,R,u,X),ls=!1,Ee=s.memoizedState,R.state=Ee,Fc(s,u,R,g);var Ke=s.memoizedState;B!==be||Ee!==Ke||ni.current||ls?(typeof Ge=="function"&&(bh(s,o,Ge,u),Ke=s.memoizedState),(ge=ls||_0(s,o,ge,u,Ee,Ke,X)||!1)?(we||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,Ke,X),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,Ke,X)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=Ke),R.props=u,R.state=Ke,R.context=X,u=ge):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&Ee===n.memoizedState||(s.flags|=1024),u=!1)}return Ph(n,s,o,u,y,g)}function Ph(n,s,o,u,g,y){N0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return g&&kg(s,o,!1),Pr(n,s,y);u=s.stateNode,YS.current=s;var B=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=Ga(s,n.child,null,y),s.child=Ga(s,null,B,y)):$n(n,s,B,y),s.memoizedState=u.state,g&&kg(s,o,!0),s.child}function D0(n){var s=n.stateNode;s.pendingContext?Ug(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Ug(n,s.context,!1),fh(n,s.containerInfo)}function I0(n,s,o,u,g){return Va(),ah(g),s.flags|=256,$n(n,s,o,u),s.child}var Nh={dehydrated:null,treeContext:null,retryLane:0};function Lh(n){return{baseLanes:n,cachePool:null,transitions:null}}function U0(n,s,o){var u=s.pendingProps,g=cn.current,y=!1,R=(s.flags&128)!==0,B;if((B=R)||(B=n!==null&&n.memoizedState===null?!1:(g&2)!==0),B?(y=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(g|=1),Zt(cn,g&1),n===null)return sh(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,y?(u=s.mode,y=s.child,R={mode:"hidden",children:R},(u&1)===0&&y!==null?(y.childLanes=0,y.pendingProps=R):y=iu(R,u,0,null),n=ra(n,u,o,null),y.return=s,n.return=s,y.sibling=n,s.child=y,s.child.memoizedState=Lh(o),s.memoizedState=Nh,n):Dh(s,R));if(g=n.memoizedState,g!==null&&(B=g.dehydrated,B!==null))return QS(n,s,R,u,B,g,o);if(y){y=u.fallback,R=s.mode,g=n.child,B=g.sibling;var X={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==g?(u=s.child,u.childLanes=0,u.pendingProps=X,s.deletions=null):(u=ms(g,X),u.subtreeFlags=g.subtreeFlags&14680064),B!==null?y=ms(B,y):(y=ra(y,R,o,null),y.flags|=2),y.return=s,u.return=s,u.sibling=y,s.child=u,u=y,y=s.child,R=n.child.memoizedState,R=R===null?Lh(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},y.memoizedState=R,y.childLanes=n.childLanes&~o,s.memoizedState=Nh,u}return y=n.child,n=y.sibling,u=ms(y,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Dh(n,s){return s=iu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function jc(n,s,o,u){return u!==null&&ah(u),Ga(s,n.child,null,o),n=Dh(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function QS(n,s,o,u,g,y,R){if(o)return s.flags&256?(s.flags&=-257,u=Ch(Error(t(422))),jc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(y=u.fallback,g=s.mode,u=iu({mode:"visible",children:u.children},g,0,null),y=ra(y,g,R,null),y.flags|=2,u.return=s,y.return=s,u.sibling=y,s.child=u,(s.mode&1)!==0&&Ga(s,n.child,null,R),s.child.memoizedState=Lh(R),s.memoizedState=Nh,y);if((s.mode&1)===0)return jc(n,s,R,null);if(g.data==="$!"){if(u=g.nextSibling&&g.nextSibling.dataset,u)var B=u.dgst;return u=B,y=Error(t(419)),u=Ch(y,u,void 0),jc(n,s,R,u)}if(B=(R&n.childLanes)!==0,ri||B){if(u=Cn,u!==null){switch(R&-R){case 4:g=2;break;case 16:g=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:g=32;break;case 536870912:g=268435456;break;default:g=0}g=(g&(u.suspendedLanes|R))!==0?0:g,g!==0&&g!==y.retryLane&&(y.retryLane=g,Rr(n,g),Gi(u,n,g,-1))}return Kh(),u=Ch(Error(t(421))),jc(n,s,R,u)}return g.data==="$?"?(s.flags|=128,s.child=n.child,s=uM.bind(null,n),g._reactRetry=s,null):(n=y.treeContext,mi=rs(g.nextSibling),pi=s,sn=!0,zi=null,n!==null&&(bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=Ks,Tr=n.id,Cr=n.overflow,Ks=s),s=Dh(s,u.children),s.flags|=4096,s)}function F0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),uh(n.return,s,o)}function Ih(n,s,o,u,g){var y=n.memoizedState;y===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:g}:(y.isBackwards=s,y.rendering=null,y.renderingStartTime=0,y.last=u,y.tail=o,y.tailMode=g)}function k0(n,s,o){var u=s.pendingProps,g=u.revealOrder,y=u.tail;if($n(n,s,u.children,o),u=cn.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&F0(n,o,s);else if(n.tag===19)F0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if(Zt(cn,u),(s.mode&1)===0)s.memoizedState=null;else switch(g){case"forwards":for(o=s.child,g=null;o!==null;)n=o.alternate,n!==null&&kc(n)===null&&(g=o),o=o.sibling;o=g,o===null?(g=s.child,s.child=null):(g=o.sibling,o.sibling=null),Ih(s,!1,g,o,y);break;case"backwards":for(o=null,g=s.child,s.child=null;g!==null;){if(n=g.alternate,n!==null&&kc(n)===null){s.child=g;break}n=g.sibling,g.sibling=o,o=g,g=n}Ih(s,!0,o,null,y);break;case"together":Ih(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function Wc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Pr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),ea|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=ms(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=ms(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function ZS(n,s,o){switch(s.tag){case 3:D0(s),Va();break;case 5:Qg(s);break;case 1:ii(s.type)&&Cc(s);break;case 4:fh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,g=s.memoizedProps.value;Zt(Dc,u._currentValue),u._currentValue=g;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?(Zt(cn,cn.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?U0(n,s,o):(Zt(cn,cn.current&1),n=Pr(n,s,o),n!==null?n.sibling:null);Zt(cn,cn.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return k0(n,s,o);s.flags|=128}if(g=s.memoizedState,g!==null&&(g.rendering=null,g.tail=null,g.lastEffect=null),Zt(cn,cn.current),u)break;return null;case 22:case 23:return s.lanes=0,P0(n,s,o)}return Pr(n,s,o)}var O0,Uh,z0,B0;O0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Uh=function(){},z0=function(n,s,o,u){var g=n.memoizedProps;if(g!==u){n=s.stateNode,Zs(nr.current);var y=null;switch(o){case"input":g=Nt(n,g),u=Nt(n,u),y=[];break;case"select":g=he({},g,{value:void 0}),u=he({},u,{value:void 0}),y=[];break;case"textarea":g=Yt(n,g),u=Yt(n,u),y=[];break;default:typeof g.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=wc)}Ue(o,u);var R;o=null;for(ge in g)if(!u.hasOwnProperty(ge)&&g.hasOwnProperty(ge)&&g[ge]!=null)if(ge==="style"){var B=g[ge];for(R in B)B.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else ge!=="dangerouslySetInnerHTML"&&ge!=="children"&&ge!=="suppressContentEditableWarning"&&ge!=="suppressHydrationWarning"&&ge!=="autoFocus"&&(a.hasOwnProperty(ge)?y||(y=[]):(y=y||[]).push(ge,null));for(ge in u){var X=u[ge];if(B=g!=null?g[ge]:void 0,u.hasOwnProperty(ge)&&X!==B&&(X!=null||B!=null))if(ge==="style")if(B){for(R in B)!B.hasOwnProperty(R)||X&&X.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in X)X.hasOwnProperty(R)&&B[R]!==X[R]&&(o||(o={}),o[R]=X[R])}else o||(y||(y=[]),y.push(ge,o)),o=X;else ge==="dangerouslySetInnerHTML"?(X=X?X.__html:void 0,B=B?B.__html:void 0,X!=null&&B!==X&&(y=y||[]).push(ge,X)):ge==="children"?typeof X!="string"&&typeof X!="number"||(y=y||[]).push(ge,""+X):ge!=="suppressContentEditableWarning"&&ge!=="suppressHydrationWarning"&&(a.hasOwnProperty(ge)?(X!=null&&ge==="onScroll"&&en("scroll",n),y||B===X||(y=[])):(y=y||[]).push(ge,X))}o&&(y=y||[]).push("style",o);var ge=y;(s.updateQueue=ge)&&(s.flags|=4)}},B0=function(n,s,o,u){o!==u&&(s.flags|=4)};function yl(n,s){if(!sn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function zn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var g=n.child;g!==null;)o|=g.lanes|g.childLanes,u|=g.subtreeFlags&14680064,u|=g.flags&14680064,g.return=n,g=g.sibling;else for(g=n.child;g!==null;)o|=g.lanes|g.childLanes,u|=g.subtreeFlags,u|=g.flags,g.return=n,g=g.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function JS(n,s,o){var u=s.pendingProps;switch(ih(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return zn(s),null;case 1:return ii(s.type)&&Tc(),zn(s),null;case 3:return u=s.stateNode,Xa(),tn(ni),tn(kn),gh(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Nc(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(Xh(zi),zi=null))),Uh(n,s),zn(s),null;case 5:ph(s);var g=Zs(ml.current);if(o=s.type,n!==null&&s.stateNode!=null)z0(n,s,o,u,g),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return zn(s),null}if(n=Zs(nr.current),Nc(s)){u=s.stateNode,o=s.type;var y=s.memoizedProps;switch(u[tr]=s,u[ul]=y,n=(s.mode&1)!==0,o){case"dialog":en("cancel",u),en("close",u);break;case"iframe":case"object":case"embed":en("load",u);break;case"video":case"audio":for(g=0;g<ol.length;g++)en(ol[g],u);break;case"source":en("error",u);break;case"img":case"image":case"link":en("error",u),en("load",u);break;case"details":en("toggle",u);break;case"input":bt(u,y),en("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!y.multiple},en("invalid",u);break;case"textarea":Q(u,y),en("invalid",u)}Ue(o,y),g=null;for(var R in y)if(y.hasOwnProperty(R)){var B=y[R];R==="children"?typeof B=="string"?u.textContent!==B&&(y.suppressHydrationWarning!==!0&&Ec(u.textContent,B,n),g=["children",B]):typeof B=="number"&&u.textContent!==""+B&&(y.suppressHydrationWarning!==!0&&Ec(u.textContent,B,n),g=["children",""+B]):a.hasOwnProperty(R)&&B!=null&&R==="onScroll"&&en("scroll",u)}switch(o){case"input":Xe(u),nn(u,y,!0);break;case"textarea":Xe(u),Rt(u);break;case"select":case"option":break;default:typeof y.onClick=="function"&&(u.onclick=wc)}u=g,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=g.nodeType===9?g:g.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=F(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[tr]=s,n[ul]=u,O0(n,s,!1,!1),s.stateNode=n;e:{switch(R=Ce(o,u),o){case"dialog":en("cancel",n),en("close",n),g=u;break;case"iframe":case"object":case"embed":en("load",n),g=u;break;case"video":case"audio":for(g=0;g<ol.length;g++)en(ol[g],n);g=u;break;case"source":en("error",n),g=u;break;case"img":case"image":case"link":en("error",n),en("load",n),g=u;break;case"details":en("toggle",n),g=u;break;case"input":bt(n,u),g=Nt(n,u),en("invalid",n);break;case"option":g=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},g=he({},u,{value:void 0}),en("invalid",n);break;case"textarea":Q(n,u),g=Yt(n,u),en("invalid",n);break;default:g=u}Ue(o,g),B=g;for(y in B)if(B.hasOwnProperty(y)){var X=B[y];y==="style"?ye(n,X):y==="dangerouslySetInnerHTML"?(X=X?X.__html:void 0,X!=null&&ae(n,X)):y==="children"?typeof X=="string"?(o!=="textarea"||X!=="")&&xe(n,X):typeof X=="number"&&xe(n,""+X):y!=="suppressContentEditableWarning"&&y!=="suppressHydrationWarning"&&y!=="autoFocus"&&(a.hasOwnProperty(y)?X!=null&&y==="onScroll"&&en("scroll",n):X!=null&&L(n,y,X,R))}switch(o){case"input":Xe(n),nn(n,u,!1);break;case"textarea":Xe(n),Rt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+fe(u.value));break;case"select":n.multiple=!!u.multiple,y=u.value,y!=null?It(n,!!u.multiple,y,!1):u.defaultValue!=null&&It(n,!!u.multiple,u.defaultValue,!0);break;default:typeof g.onClick=="function"&&(n.onclick=wc)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return zn(s),null;case 6:if(n&&s.stateNode!=null)B0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Zs(ml.current),Zs(nr.current),Nc(s)){if(u=s.stateNode,o=s.memoizedProps,u[tr]=s,(y=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Ec(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Ec(u.nodeValue,o,(n.mode&1)!==0)}y&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[tr]=s,s.stateNode=u}return zn(s),null;case 13:if(tn(cn),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(sn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Gg(),Va(),s.flags|=98560,y=!1;else if(y=Nc(s),u!==null&&u.dehydrated!==null){if(n===null){if(!y)throw Error(t(318));if(y=s.memoizedState,y=y!==null?y.dehydrated:null,!y)throw Error(t(317));y[tr]=s}else Va(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;zn(s),y=!1}else zi!==null&&(Xh(zi),zi=null),y=!0;if(!y)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(cn.current&1)!==0?yn===0&&(yn=3):Kh())),s.updateQueue!==null&&(s.flags|=4),zn(s),null);case 4:return Xa(),Uh(n,s),n===null&&ll(s.stateNode.containerInfo),zn(s),null;case 10:return ch(s.type._context),zn(s),null;case 17:return ii(s.type)&&Tc(),zn(s),null;case 19:if(tn(cn),y=s.memoizedState,y===null)return zn(s),null;if(u=(s.flags&128)!==0,R=y.rendering,R===null)if(u)yl(y,!1);else{if(yn!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=kc(n),R!==null){for(s.flags|=128,yl(y,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)y=o,n=u,y.flags&=14680066,R=y.alternate,R===null?(y.childLanes=0,y.lanes=n,y.child=null,y.subtreeFlags=0,y.memoizedProps=null,y.memoizedState=null,y.updateQueue=null,y.dependencies=null,y.stateNode=null):(y.childLanes=R.childLanes,y.lanes=R.lanes,y.child=R.child,y.subtreeFlags=0,y.deletions=null,y.memoizedProps=R.memoizedProps,y.memoizedState=R.memoizedState,y.updateQueue=R.updateQueue,y.type=R.type,n=R.dependencies,y.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return Zt(cn,cn.current&1|2),s.child}n=n.sibling}y.tail!==null&&ln()>Ya&&(s.flags|=128,u=!0,yl(y,!1),s.lanes=4194304)}else{if(!u)if(n=kc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),yl(y,!0),y.tail===null&&y.tailMode==="hidden"&&!R.alternate&&!sn)return zn(s),null}else 2*ln()-y.renderingStartTime>Ya&&o!==1073741824&&(s.flags|=128,u=!0,yl(y,!1),s.lanes=4194304);y.isBackwards?(R.sibling=s.child,s.child=R):(o=y.last,o!==null?o.sibling=R:s.child=R,y.last=R)}return y.tail!==null?(s=y.tail,y.rendering=s,y.tail=s.sibling,y.renderingStartTime=ln(),s.sibling=null,o=cn.current,Zt(cn,u?o&1|2:o&1),s):(zn(s),null);case 22:case 23:return qh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(zn(s),s.subtreeFlags&6&&(s.flags|=8192)):zn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function eM(n,s){switch(ih(s),s.tag){case 1:return ii(s.type)&&Tc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return Xa(),tn(ni),tn(kn),gh(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return ph(s),null;case 13:if(tn(cn),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Va()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return tn(cn),null;case 4:return Xa(),null;case 10:return ch(s.type._context),null;case 22:case 23:return qh(),null;case 24:return null;default:return null}}var Xc=!1,Bn=!1,tM=typeof WeakSet=="function"?WeakSet:Set,$e=null;function qa(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){hn(n,s,u)}else o.current=null}function Fh(n,s,o){try{o()}catch(u){hn(n,s,u)}}var H0=!1;function nM(n,s){if(qd=hc,n=_g(),Bd(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var g=u.anchorOffset,y=u.focusNode;u=u.focusOffset;try{o.nodeType,y.nodeType}catch{o=null;break e}var R=0,B=-1,X=-1,ge=0,we=0,be=n,Ee=null;t:for(;;){for(var Ge;be!==o||g!==0&&be.nodeType!==3||(B=R+g),be!==y||u!==0&&be.nodeType!==3||(X=R+u),be.nodeType===3&&(R+=be.nodeValue.length),(Ge=be.firstChild)!==null;)Ee=be,be=Ge;for(;;){if(be===n)break t;if(Ee===o&&++ge===g&&(B=R),Ee===y&&++we===u&&(X=R),(Ge=be.nextSibling)!==null)break;be=Ee,Ee=be.parentNode}be=Ge}o=B===-1||X===-1?null:{start:B,end:X}}else o=null}o=o||{start:0,end:0}}else o=null;for(Kd={focusedElem:n,selectionRange:o},hc=!1,$e=s;$e!==null;)if(s=$e,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,$e=n;else for(;$e!==null;){s=$e;try{var Ke=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if(Ke!==null){var Ze=Ke.memoizedProps,pn=Ke.memoizedState,se=s.stateNode,Y=se.getSnapshotBeforeUpdate(s.elementType===s.type?Ze:Bi(s.type,Ze),pn);se.__reactInternalSnapshotBeforeUpdate=Y}break;case 3:var ce=s.stateNode.containerInfo;ce.nodeType===1?ce.textContent="":ce.nodeType===9&&ce.documentElement&&ce.removeChild(ce.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Re){hn(s,s.return,Re)}if(n=s.sibling,n!==null){n.return=s.return,$e=n;break}$e=s.return}return Ke=H0,H0=!1,Ke}function Sl(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var g=u=u.next;do{if((g.tag&n)===n){var y=g.destroy;g.destroy=void 0,y!==void 0&&Fh(s,o,y)}g=g.next}while(g!==u)}}function $c(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function kh(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function V0(n){var s=n.alternate;s!==null&&(n.alternate=null,V0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[tr],delete s[ul],delete s[Jd],delete s[OS],delete s[zS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function G0(n){return n.tag===5||n.tag===3||n.tag===4}function j0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||G0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Oh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=wc));else if(u!==4&&(n=n.child,n!==null))for(Oh(n,s,o),n=n.sibling;n!==null;)Oh(n,s,o),n=n.sibling}function zh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(zh(n,s,o),n=n.sibling;n!==null;)zh(n,s,o),n=n.sibling}var Ln=null,Hi=!1;function us(n,s,o){for(o=o.child;o!==null;)W0(n,s,o),o=o.sibling}function W0(n,s,o){if(De&&typeof De.onCommitFiberUnmount=="function")try{De.onCommitFiberUnmount(oe,o)}catch{}switch(o.tag){case 5:Bn||qa(o,s);case 6:var u=Ln,g=Hi;Ln=null,us(n,s,o),Ln=u,Hi=g,Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Ln.removeChild(o.stateNode));break;case 18:Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?Zd(n.parentNode,o):n.nodeType===1&&Zd(n,o),Jo(n)):Zd(Ln,o.stateNode));break;case 4:u=Ln,g=Hi,Ln=o.stateNode.containerInfo,Hi=!0,us(n,s,o),Ln=u,Hi=g;break;case 0:case 11:case 14:case 15:if(!Bn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){g=u=u.next;do{var y=g,R=y.destroy;y=y.tag,R!==void 0&&((y&2)!==0||(y&4)!==0)&&Fh(o,s,R),g=g.next}while(g!==u)}us(n,s,o);break;case 1:if(!Bn&&(qa(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(B){hn(o,s,B)}us(n,s,o);break;case 21:us(n,s,o);break;case 22:o.mode&1?(Bn=(u=Bn)||o.memoizedState!==null,us(n,s,o),Bn=u):us(n,s,o);break;default:us(n,s,o)}}function X0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new tM),s.forEach(function(u){var g=dM.bind(null,n,u);o.has(u)||(o.add(u),u.then(g,g))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var g=o[u];try{var y=n,R=s,B=R;e:for(;B!==null;){switch(B.tag){case 5:Ln=B.stateNode,Hi=!1;break e;case 3:Ln=B.stateNode.containerInfo,Hi=!0;break e;case 4:Ln=B.stateNode.containerInfo,Hi=!0;break e}B=B.return}if(Ln===null)throw Error(t(160));W0(y,R,g),Ln=null,Hi=!1;var X=g.alternate;X!==null&&(X.return=null),g.return=null}catch(ge){hn(g,s,ge)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)$0(s,n),s=s.sibling}function $0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),rr(n),u&4){try{Sl(3,n,n.return),$c(3,n)}catch(Ze){hn(n,n.return,Ze)}try{Sl(5,n,n.return)}catch(Ze){hn(n,n.return,Ze)}}break;case 1:Vi(s,n),rr(n),u&512&&o!==null&&qa(o,o.return);break;case 5:if(Vi(s,n),rr(n),u&512&&o!==null&&qa(o,o.return),n.flags&32){var g=n.stateNode;try{xe(g,"")}catch(Ze){hn(n,n.return,Ze)}}if(u&4&&(g=n.stateNode,g!=null)){var y=n.memoizedProps,R=o!==null?o.memoizedProps:y,B=n.type,X=n.updateQueue;if(n.updateQueue=null,X!==null)try{B==="input"&&y.type==="radio"&&y.name!=null&&yt(g,y),Ce(B,R);var ge=Ce(B,y);for(R=0;R<X.length;R+=2){var we=X[R],be=X[R+1];we==="style"?ye(g,be):we==="dangerouslySetInnerHTML"?ae(g,be):we==="children"?xe(g,be):L(g,we,be,ge)}switch(B){case"input":qt(g,y);break;case"textarea":mn(g,y);break;case"select":var Ee=g._wrapperState.wasMultiple;g._wrapperState.wasMultiple=!!y.multiple;var Ge=y.value;Ge!=null?It(g,!!y.multiple,Ge,!1):Ee!==!!y.multiple&&(y.defaultValue!=null?It(g,!!y.multiple,y.defaultValue,!0):It(g,!!y.multiple,y.multiple?[]:"",!1))}g[ul]=y}catch(Ze){hn(n,n.return,Ze)}}break;case 6:if(Vi(s,n),rr(n),u&4){if(n.stateNode===null)throw Error(t(162));g=n.stateNode,y=n.memoizedProps;try{g.nodeValue=y}catch(Ze){hn(n,n.return,Ze)}}break;case 3:if(Vi(s,n),rr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Jo(s.containerInfo)}catch(Ze){hn(n,n.return,Ze)}break;case 4:Vi(s,n),rr(n);break;case 13:Vi(s,n),rr(n),g=n.child,g.flags&8192&&(y=g.memoizedState!==null,g.stateNode.isHidden=y,!y||g.alternate!==null&&g.alternate.memoizedState!==null||(Vh=ln())),u&4&&X0(n);break;case 22:if(we=o!==null&&o.memoizedState!==null,n.mode&1?(Bn=(ge=Bn)||we,Vi(s,n),Bn=ge):Vi(s,n),rr(n),u&8192){if(ge=n.memoizedState!==null,(n.stateNode.isHidden=ge)&&!we&&(n.mode&1)!==0)for($e=n,we=n.child;we!==null;){for(be=$e=we;$e!==null;){switch(Ee=$e,Ge=Ee.child,Ee.tag){case 0:case 11:case 14:case 15:Sl(4,Ee,Ee.return);break;case 1:qa(Ee,Ee.return);var Ke=Ee.stateNode;if(typeof Ke.componentWillUnmount=="function"){u=Ee,o=Ee.return;try{s=u,Ke.props=s.memoizedProps,Ke.state=s.memoizedState,Ke.componentWillUnmount()}catch(Ze){hn(u,o,Ze)}}break;case 5:qa(Ee,Ee.return);break;case 22:if(Ee.memoizedState!==null){Y0(be);continue}}Ge!==null?(Ge.return=Ee,$e=Ge):Y0(be)}we=we.sibling}e:for(we=null,be=n;;){if(be.tag===5){if(we===null){we=be;try{g=be.stateNode,ge?(y=g.style,typeof y.setProperty=="function"?y.setProperty("display","none","important"):y.display="none"):(B=be.stateNode,X=be.memoizedProps.style,R=X!=null&&X.hasOwnProperty("display")?X.display:null,B.style.display=_e("display",R))}catch(Ze){hn(n,n.return,Ze)}}}else if(be.tag===6){if(we===null)try{be.stateNode.nodeValue=ge?"":be.memoizedProps}catch(Ze){hn(n,n.return,Ze)}}else if((be.tag!==22&&be.tag!==23||be.memoizedState===null||be===n)&&be.child!==null){be.child.return=be,be=be.child;continue}if(be===n)break e;for(;be.sibling===null;){if(be.return===null||be.return===n)break e;we===be&&(we=null),be=be.return}we===be&&(we=null),be.sibling.return=be.return,be=be.sibling}}break;case 19:Vi(s,n),rr(n),u&4&&X0(n);break;case 21:break;default:Vi(s,n),rr(n)}}function rr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(G0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var g=u.stateNode;u.flags&32&&(xe(g,""),u.flags&=-33);var y=j0(n);zh(n,y,g);break;case 3:case 4:var R=u.stateNode.containerInfo,B=j0(n);Oh(n,B,R);break;default:throw Error(t(161))}}catch(X){hn(n,n.return,X)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function iM(n,s,o){$e=n,q0(n)}function q0(n,s,o){for(var u=(n.mode&1)!==0;$e!==null;){var g=$e,y=g.child;if(g.tag===22&&u){var R=g.memoizedState!==null||Xc;if(!R){var B=g.alternate,X=B!==null&&B.memoizedState!==null||Bn;B=Xc;var ge=Bn;if(Xc=R,(Bn=X)&&!ge)for($e=g;$e!==null;)R=$e,X=R.child,R.tag===22&&R.memoizedState!==null?Q0(g):X!==null?(X.return=R,$e=X):Q0(g);for(;y!==null;)$e=y,q0(y),y=y.sibling;$e=g,Xc=B,Bn=ge}K0(n)}else(g.subtreeFlags&8772)!==0&&y!==null?(y.return=g,$e=y):K0(n)}}function K0(n){for(;$e!==null;){var s=$e;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Bn||$c(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Bn)if(o===null)u.componentDidMount();else{var g=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(g,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var y=s.updateQueue;y!==null&&Yg(s,y,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}Yg(s,R,o)}break;case 5:var B=s.stateNode;if(o===null&&s.flags&4){o=B;var X=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":X.autoFocus&&o.focus();break;case"img":X.src&&(o.src=X.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var ge=s.alternate;if(ge!==null){var we=ge.memoizedState;if(we!==null){var be=we.dehydrated;be!==null&&Jo(be)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Bn||s.flags&512&&kh(s)}catch(Ee){hn(s,s.return,Ee)}}if(s===n){$e=null;break}if(o=s.sibling,o!==null){o.return=s.return,$e=o;break}$e=s.return}}function Y0(n){for(;$e!==null;){var s=$e;if(s===n){$e=null;break}var o=s.sibling;if(o!==null){o.return=s.return,$e=o;break}$e=s.return}}function Q0(n){for(;$e!==null;){var s=$e;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{$c(4,s)}catch(X){hn(s,o,X)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var g=s.return;try{u.componentDidMount()}catch(X){hn(s,g,X)}}var y=s.return;try{kh(s)}catch(X){hn(s,y,X)}break;case 5:var R=s.return;try{kh(s)}catch(X){hn(s,R,X)}}}catch(X){hn(s,s.return,X)}if(s===n){$e=null;break}var B=s.sibling;if(B!==null){B.return=s.return,$e=B;break}$e=s.return}}var rM=Math.ceil,qc=C.ReactCurrentDispatcher,Bh=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,Lt=0,Cn=null,xn=null,Dn=0,gi=0,Ka=ss(0),yn=0,Ml=null,ea=0,Kc=0,Hh=0,El=null,si=null,Vh=0,Ya=1/0,Nr=null,Yc=!1,Gh=null,ds=null,Qc=!1,hs=null,Zc=0,wl=0,jh=null,Jc=-1,eu=0;function qn(){return(Lt&6)!==0?ln():Jc!==-1?Jc:Jc=ln()}function fs(n){return(n.mode&1)===0?1:(Lt&2)!==0&&Dn!==0?Dn&-Dn:HS.transition!==null?(eu===0&&(eu=Ve()),eu):(n=Mt,n!==0||(n=window.event,n=n===void 0?16:Jm(n.type)),n)}function Gi(n,s,o,u){if(50<wl)throw wl=0,jh=null,Error(t(185));St(n,o,u),((Lt&2)===0||n!==Cn)&&(n===Cn&&((Lt&2)===0&&(Kc|=o),yn===4&&ps(n,Dn)),ai(n,u),o===1&&Lt===0&&(s.mode&1)===0&&(Ya=ln()+500,Rc&&os()))}function ai(n,s){var o=n.callbackNode;Ht(n,s);var u=Qt(n,n===Cn?Dn:0);if(u===0)o!==null&&$o(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&$o(o),s===1)n.tag===0?BS(J0.bind(null,n)):Og(J0.bind(null,n)),FS(function(){(Lt&6)===0&&os()}),o=null;else{switch(Er(u)){case 1:o=qo;break;case 4:o=P;break;case 16:o=Z;break;case 536870912:o=le;break;default:o=Z}o=ox(o,Z0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function Z0(n,s){if(Jc=-1,eu=0,(Lt&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Qa()&&n.callbackNode!==o)return null;var u=Qt(n,n===Cn?Dn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=tu(n,u);else{s=u;var g=Lt;Lt|=2;var y=tx();(Cn!==n||Dn!==s)&&(Nr=null,Ya=ln()+500,na(n,s));do try{oM();break}catch(B){ex(n,B)}while(!0);lh(),qc.current=y,Lt=g,xn!==null?s=0:(Cn=null,Dn=0,s=yn)}if(s!==0){if(s===2&&(g=gn(n),g!==0&&(u=g,s=Wh(n,g))),s===1)throw o=Ml,na(n,0),ps(n,u),ai(n,ln()),o;if(s===6)ps(n,u);else{if(g=n.current.alternate,(u&30)===0&&!sM(g)&&(s=tu(n,u),s===2&&(y=gn(n),y!==0&&(u=y,s=Wh(n,y))),s===1))throw o=Ml,na(n,0),ps(n,u),ai(n,ln()),o;switch(n.finishedWork=g,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:ia(n,si,Nr);break;case 3:if(ps(n,u),(u&130023424)===u&&(s=Vh+500-ln(),10<s)){if(Qt(n,0)!==0)break;if(g=n.suspendedLanes,(g&u)!==u){qn(),n.pingedLanes|=n.suspendedLanes&g;break}n.timeoutHandle=Qd(ia.bind(null,n,si,Nr),s);break}ia(n,si,Nr);break;case 4:if(ps(n,u),(u&4194240)===u)break;for(s=n.eventTimes,g=-1;0<u;){var R=31-Pe(u);y=1<<R,R=s[R],R>g&&(g=R),u&=~y}if(u=g,u=ln()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*rM(u/1960))-u,10<u){n.timeoutHandle=Qd(ia.bind(null,n,si,Nr),u);break}ia(n,si,Nr);break;case 5:ia(n,si,Nr);break;default:throw Error(t(329))}}}return ai(n,ln()),n.callbackNode===o?Z0.bind(null,n):null}function Wh(n,s){var o=El;return n.current.memoizedState.isDehydrated&&(na(n,s).flags|=256),n=tu(n,s),n!==2&&(s=si,si=o,s!==null&&Xh(s)),n}function Xh(n){si===null?si=n:si.push.apply(si,n)}function sM(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var g=o[u],y=g.getSnapshot;g=g.value;try{if(!Oi(y(),g))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function ps(n,s){for(s&=~Hh,s&=~Kc,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Pe(s),u=1<<o;n[o]=-1,s&=~u}}function J0(n){if((Lt&6)!==0)throw Error(t(327));Qa();var s=Qt(n,0);if((s&1)===0)return ai(n,ln()),null;var o=tu(n,s);if(n.tag!==0&&o===2){var u=gn(n);u!==0&&(s=u,o=Wh(n,u))}if(o===1)throw o=Ml,na(n,0),ps(n,s),ai(n,ln()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,ia(n,si,Nr),ai(n,ln()),null}function $h(n,s){var o=Lt;Lt|=1;try{return n(s)}finally{Lt=o,Lt===0&&(Ya=ln()+500,Rc&&os())}}function ta(n){hs!==null&&hs.tag===0&&(Lt&6)===0&&Qa();var s=Lt;Lt|=1;var o=Ai.transition,u=Mt;try{if(Ai.transition=null,Mt=1,n)return n()}finally{Mt=u,Ai.transition=o,Lt=s,(Lt&6)===0&&os()}}function qh(){gi=Ka.current,tn(Ka)}function na(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,US(o)),xn!==null)for(o=xn.return;o!==null;){var u=o;switch(ih(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&Tc();break;case 3:Xa(),tn(ni),tn(kn),gh();break;case 5:ph(u);break;case 4:Xa();break;case 13:tn(cn);break;case 19:tn(cn);break;case 10:ch(u.type._context);break;case 22:case 23:qh()}o=o.return}if(Cn=n,xn=n=ms(n.current,null),Dn=gi=s,yn=0,Ml=null,Hh=Kc=ea=0,si=El=null,Qs!==null){for(s=0;s<Qs.length;s++)if(o=Qs[s],u=o.interleaved,u!==null){o.interleaved=null;var g=u.next,y=o.pending;if(y!==null){var R=y.next;y.next=g,u.next=R}o.pending=u}Qs=null}return n}function ex(n,s){do{var o=xn;try{if(lh(),Oc.current=Vc,zc){for(var u=un.memoizedState;u!==null;){var g=u.queue;g!==null&&(g.pending=null),u=u.next}zc=!1}if(Js=0,Tn=_n=un=null,gl=!1,xl=0,Bh.current=null,o===null||o.return===null){yn=1,Ml=s,xn=null;break}e:{var y=n,R=o.return,B=o,X=s;if(s=Dn,B.flags|=32768,X!==null&&typeof X=="object"&&typeof X.then=="function"){var ge=X,we=B,be=we.tag;if((we.mode&1)===0&&(be===0||be===11||be===15)){var Ee=we.alternate;Ee?(we.updateQueue=Ee.updateQueue,we.memoizedState=Ee.memoizedState,we.lanes=Ee.lanes):(we.updateQueue=null,we.memoizedState=null)}var Ge=b0(R);if(Ge!==null){Ge.flags&=-257,T0(Ge,R,B,y,s),Ge.mode&1&&w0(y,ge,s),s=Ge,X=ge;var Ke=s.updateQueue;if(Ke===null){var Ze=new Set;Ze.add(X),s.updateQueue=Ze}else Ke.add(X);break e}else{if((s&1)===0){w0(y,ge,s),Kh();break e}X=Error(t(426))}}else if(sn&&B.mode&1){var pn=b0(R);if(pn!==null){(pn.flags&65536)===0&&(pn.flags|=256),T0(pn,R,B,y,s),ah($a(X,B));break e}}y=X=$a(X,B),yn!==4&&(yn=2),El===null?El=[y]:El.push(y),y=R;do{switch(y.tag){case 3:y.flags|=65536,s&=-s,y.lanes|=s;var se=M0(y,X,s);Kg(y,se);break e;case 1:B=X;var Y=y.type,ce=y.stateNode;if((y.flags&128)===0&&(typeof Y.getDerivedStateFromError=="function"||ce!==null&&typeof ce.componentDidCatch=="function"&&(ds===null||!ds.has(ce)))){y.flags|=65536,s&=-s,y.lanes|=s;var Re=E0(y,B,s);Kg(y,Re);break e}}y=y.return}while(y!==null)}ix(o)}catch(tt){s=tt,xn===o&&o!==null&&(xn=o=o.return);continue}break}while(!0)}function tx(){var n=qc.current;return qc.current=Vc,n===null?Vc:n}function Kh(){(yn===0||yn===3||yn===2)&&(yn=4),Cn===null||(ea&268435455)===0&&(Kc&268435455)===0||ps(Cn,Dn)}function tu(n,s){var o=Lt;Lt|=2;var u=tx();(Cn!==n||Dn!==s)&&(Nr=null,na(n,s));do try{aM();break}catch(g){ex(n,g)}while(!0);if(lh(),Lt=o,qc.current=u,xn!==null)throw Error(t(261));return Cn=null,Dn=0,yn}function aM(){for(;xn!==null;)nx(xn)}function oM(){for(;xn!==null&&!uc();)nx(xn)}function nx(n){var s=ax(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?ix(n):xn=s,Bh.current=null}function ix(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=JS(o,s,gi),o!==null){xn=o;return}}else{if(o=eM(o,s),o!==null){o.flags&=32767,xn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{yn=6,xn=null;return}}if(s=s.sibling,s!==null){xn=s;return}xn=s=n}while(s!==null);yn===0&&(yn=5)}function ia(n,s,o){var u=Mt,g=Ai.transition;try{Ai.transition=null,Mt=1,lM(n,s,o,u)}finally{Ai.transition=g,Mt=u}return null}function lM(n,s,o,u){do Qa();while(hs!==null);if((Lt&6)!==0)throw Error(t(327));o=n.finishedWork;var g=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var y=o.lanes|o.childLanes;if(ei(n,y),n===Cn&&(xn=Cn=null,Dn=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Qc||(Qc=!0,ox(Z,function(){return Qa(),null})),y=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||y){y=Ai.transition,Ai.transition=null;var R=Mt;Mt=1;var B=Lt;Lt|=4,Bh.current=null,nM(n,o),$0(o,n),RS(Kd),hc=!!qd,Kd=qd=null,n.current=o,iM(o),Cd(),Lt=B,Mt=R,Ai.transition=y}else n.current=o;if(Qc&&(Qc=!1,hs=n,Zc=g),y=n.pendingLanes,y===0&&(ds=null),We(o.stateNode),ai(n,ln()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)g=s[o],u(g.value,{componentStack:g.stack,digest:g.digest});if(Yc)throw Yc=!1,n=Gh,Gh=null,n;return(Zc&1)!==0&&n.tag!==0&&Qa(),y=n.pendingLanes,(y&1)!==0?n===jh?wl++:(wl=0,jh=n):wl=0,os(),null}function Qa(){if(hs!==null){var n=Er(Zc),s=Ai.transition,o=Mt;try{if(Ai.transition=null,Mt=16>n?16:n,hs===null)var u=!1;else{if(n=hs,hs=null,Zc=0,(Lt&6)!==0)throw Error(t(331));var g=Lt;for(Lt|=4,$e=n.current;$e!==null;){var y=$e,R=y.child;if(($e.flags&16)!==0){var B=y.deletions;if(B!==null){for(var X=0;X<B.length;X++){var ge=B[X];for($e=ge;$e!==null;){var we=$e;switch(we.tag){case 0:case 11:case 15:Sl(8,we,y)}var be=we.child;if(be!==null)be.return=we,$e=be;else for(;$e!==null;){we=$e;var Ee=we.sibling,Ge=we.return;if(V0(we),we===ge){$e=null;break}if(Ee!==null){Ee.return=Ge,$e=Ee;break}$e=Ge}}}var Ke=y.alternate;if(Ke!==null){var Ze=Ke.child;if(Ze!==null){Ke.child=null;do{var pn=Ze.sibling;Ze.sibling=null,Ze=pn}while(Ze!==null)}}$e=y}}if((y.subtreeFlags&2064)!==0&&R!==null)R.return=y,$e=R;else e:for(;$e!==null;){if(y=$e,(y.flags&2048)!==0)switch(y.tag){case 0:case 11:case 15:Sl(9,y,y.return)}var se=y.sibling;if(se!==null){se.return=y.return,$e=se;break e}$e=y.return}}var Y=n.current;for($e=Y;$e!==null;){R=$e;var ce=R.child;if((R.subtreeFlags&2064)!==0&&ce!==null)ce.return=R,$e=ce;else e:for(R=Y;$e!==null;){if(B=$e,(B.flags&2048)!==0)try{switch(B.tag){case 0:case 11:case 15:$c(9,B)}}catch(tt){hn(B,B.return,tt)}if(B===R){$e=null;break e}var Re=B.sibling;if(Re!==null){Re.return=B.return,$e=Re;break e}$e=B.return}}if(Lt=g,os(),De&&typeof De.onPostCommitFiberRoot=="function")try{De.onPostCommitFiberRoot(oe,n)}catch{}u=!0}return u}finally{Mt=o,Ai.transition=s}}return!1}function rx(n,s,o){s=$a(o,s),s=M0(n,s,1),n=cs(n,s,1),s=qn(),n!==null&&(St(n,1,s),ai(n,s))}function hn(n,s,o){if(n.tag===3)rx(n,n,o);else for(;s!==null;){if(s.tag===3){rx(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(ds===null||!ds.has(u))){n=$a(o,n),n=E0(s,n,1),s=cs(s,n,1),n=qn(),s!==null&&(St(s,1,n),ai(s,n));break}}s=s.return}}function cM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=qn(),n.pingedLanes|=n.suspendedLanes&o,Cn===n&&(Dn&o)===o&&(yn===4||yn===3&&(Dn&130023424)===Dn&&500>ln()-Vh?na(n,0):Hh|=o),ai(n,s)}function sx(n,s){s===0&&((n.mode&1)===0?s=1:(s=et,et<<=1,(et&130023424)===0&&(et=4194304)));var o=qn();n=Rr(n,s),n!==null&&(St(n,s,o),ai(n,o))}function uM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),sx(n,o)}function dM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,g=n.memoizedState;g!==null&&(o=g.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),sx(n,o)}var ax;ax=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ni.current)ri=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ri=!1,ZS(n,s,o);ri=(n.flags&131072)!==0}else ri=!1,sn&&(s.flags&1048576)!==0&&zg(s,Pc,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;Wc(n,s),n=s.pendingProps;var g=za(s,kn.current);Wa(s,o),g=_h(null,s,u,n,g,o);var y=yh();return s.flags|=1,typeof g=="object"&&g!==null&&typeof g.render=="function"&&g.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ii(u)?(y=!0,Cc(s)):y=!1,s.memoizedState=g.state!==null&&g.state!==void 0?g.state:null,hh(s),g.updater=Gc,s.stateNode=g,g._reactInternals=s,Th(s,u,n,o),s=Ph(null,s,u,!0,y,o)):(s.tag=0,sn&&y&&nh(s),$n(null,s,g,o),s=s.child),s;case 16:u=s.elementType;e:{switch(Wc(n,s),n=s.pendingProps,g=u._init,u=g(u._payload),s.type=u,g=s.tag=fM(u),n=Bi(u,n),g){case 0:s=Ah(null,s,u,n,o);break e;case 1:s=L0(null,s,u,n,o);break e;case 11:s=C0(null,s,u,n,o);break e;case 14:s=R0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,g=s.pendingProps,g=s.elementType===u?g:Bi(u,g),Ah(n,s,u,g,o);case 1:return u=s.type,g=s.pendingProps,g=s.elementType===u?g:Bi(u,g),L0(n,s,u,g,o);case 3:e:{if(D0(s),n===null)throw Error(t(387));u=s.pendingProps,y=s.memoizedState,g=y.element,qg(n,s),Fc(s,u,null,o);var R=s.memoizedState;if(u=R.element,y.isDehydrated)if(y={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=y,s.memoizedState=y,s.flags&256){g=$a(Error(t(423)),s),s=I0(n,s,u,o,g);break e}else if(u!==g){g=$a(Error(t(424)),s),s=I0(n,s,u,o,g);break e}else for(mi=rs(s.stateNode.containerInfo.firstChild),pi=s,sn=!0,zi=null,o=Xg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Va(),u===g){s=Pr(n,s,o);break e}$n(n,s,u,o)}s=s.child}return s;case 5:return Qg(s),n===null&&sh(s),u=s.type,g=s.pendingProps,y=n!==null?n.memoizedProps:null,R=g.children,Yd(u,g)?R=null:y!==null&&Yd(u,y)&&(s.flags|=32),N0(n,s),$n(n,s,R,o),s.child;case 6:return n===null&&sh(s),null;case 13:return U0(n,s,o);case 4:return fh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=Ga(s,null,u,o):$n(n,s,u,o),s.child;case 11:return u=s.type,g=s.pendingProps,g=s.elementType===u?g:Bi(u,g),C0(n,s,u,g,o);case 7:return $n(n,s,s.pendingProps,o),s.child;case 8:return $n(n,s,s.pendingProps.children,o),s.child;case 12:return $n(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,g=s.pendingProps,y=s.memoizedProps,R=g.value,Zt(Dc,u._currentValue),u._currentValue=R,y!==null)if(Oi(y.value,R)){if(y.children===g.children&&!ni.current){s=Pr(n,s,o);break e}}else for(y=s.child,y!==null&&(y.return=s);y!==null;){var B=y.dependencies;if(B!==null){R=y.child;for(var X=B.firstContext;X!==null;){if(X.context===u){if(y.tag===1){X=Ar(-1,o&-o),X.tag=2;var ge=y.updateQueue;if(ge!==null){ge=ge.shared;var we=ge.pending;we===null?X.next=X:(X.next=we.next,we.next=X),ge.pending=X}}y.lanes|=o,X=y.alternate,X!==null&&(X.lanes|=o),uh(y.return,o,s),B.lanes|=o;break}X=X.next}}else if(y.tag===10)R=y.type===s.type?null:y.child;else if(y.tag===18){if(R=y.return,R===null)throw Error(t(341));R.lanes|=o,B=R.alternate,B!==null&&(B.lanes|=o),uh(R,o,s),R=y.sibling}else R=y.child;if(R!==null)R.return=y;else for(R=y;R!==null;){if(R===s){R=null;break}if(y=R.sibling,y!==null){y.return=R.return,R=y;break}R=R.return}y=R}$n(n,s,g.children,o),s=s.child}return s;case 9:return g=s.type,u=s.pendingProps.children,Wa(s,o),g=Ci(g),u=u(g),s.flags|=1,$n(n,s,u,o),s.child;case 14:return u=s.type,g=Bi(u,s.pendingProps),g=Bi(u.type,g),R0(n,s,u,g,o);case 15:return A0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,g=s.pendingProps,g=s.elementType===u?g:Bi(u,g),Wc(n,s),s.tag=1,ii(u)?(n=!0,Cc(s)):n=!1,Wa(s,o),y0(s,u,g),Th(s,u,g,o),Ph(null,s,u,!0,n,o);case 19:return k0(n,s,o);case 22:return P0(n,s,o)}throw Error(t(156,s.tag))};function ox(n,s){return Ws(n,s)}function hM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new hM(n,s,o,u)}function Yh(n){return n=n.prototype,!(!n||!n.isReactComponent)}function fM(n){if(typeof n=="function")return Yh(n)?1:0;if(n!=null){if(n=n.$$typeof,n===W)return 11;if(n===q)return 14}return 2}function ms(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function nu(n,s,o,u,g,y){var R=2;if(u=n,typeof n=="function")Yh(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case U:return ra(o.children,g,y,s);case b:R=8,g|=8;break;case D:return n=Pi(12,o,s,g|2),n.elementType=D,n.lanes=y,n;case j:return n=Pi(13,o,s,g),n.elementType=j,n.lanes=y,n;case ue:return n=Pi(19,o,s,g),n.elementType=ue,n.lanes=y,n;case J:return iu(o,g,y,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case O:R=10;break e;case V:R=9;break e;case W:R=11;break e;case q:R=14;break e;case pe:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,g),s.elementType=n,s.type=u,s.lanes=y,s}function ra(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function iu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=J,n.lanes=o,n.stateNode={isHidden:!1},n}function Qh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function Zh(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function pM(n,s,o,u,g){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Nn(0),this.expirationTimes=Nn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Nn(0),this.identifierPrefix=u,this.onRecoverableError=g,this.mutableSourceEagerHydrationData=null}function Jh(n,s,o,u,g,y,R,B,X){return n=new pM(n,s,o,B,X),s===1?(s=1,y===!0&&(s|=8)):s=0,y=Pi(3,null,null,s),n.current=y,y.stateNode=n,y.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},hh(y),n}function mM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:N,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function lx(n){if(!n)return as;n=n._reactInternals;e:{if(Xn(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ii(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ii(o))return Fg(n,o,s)}return s}function cx(n,s,o,u,g,y,R,B,X){return n=Jh(o,u,!0,n,g,y,R,B,X),n.context=lx(null),o=n.current,u=qn(),g=fs(o),y=Ar(u,g),y.callback=s??null,cs(o,y,g),n.current.lanes=g,St(n,g,u),ai(n,u),n}function ru(n,s,o,u){var g=s.current,y=qn(),R=fs(g);return o=lx(o),s.context===null?s.context=o:s.pendingContext=o,s=Ar(y,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=cs(g,s,R),n!==null&&(Gi(n,g,R,y),Uc(n,g,R)),R}function su(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function ux(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function ef(n,s){ux(n,s),(n=n.alternate)&&ux(n,s)}function gM(){return null}var dx=typeof reportError=="function"?reportError:function(n){console.error(n)};function tf(n){this._internalRoot=n}au.prototype.render=tf.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));ru(n,s,null,null)},au.prototype.unmount=tf.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;ta(function(){ru(null,n,null,null)}),s[wr]=null}};function au(n){this._internalRoot=n}au.prototype.unstable_scheduleHydration=function(n){if(n){var s=Vt();n={blockedOn:null,target:n,priority:s};for(var o=0;o<ts.length&&s!==0&&s<ts[o].priority;o++);ts.splice(o,0,n),o===0&&Qm(n)}};function nf(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function ou(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function hx(){}function xM(n,s,o,u,g){if(g){if(typeof u=="function"){var y=u;u=function(){var ge=su(R);y.call(ge)}}var R=cx(s,u,n,0,null,!1,!1,"",hx);return n._reactRootContainer=R,n[wr]=R.current,ll(n.nodeType===8?n.parentNode:n),ta(),R}for(;g=n.lastChild;)n.removeChild(g);if(typeof u=="function"){var B=u;u=function(){var ge=su(X);B.call(ge)}}var X=Jh(n,0,!1,null,null,!1,!1,"",hx);return n._reactRootContainer=X,n[wr]=X.current,ll(n.nodeType===8?n.parentNode:n),ta(function(){ru(s,X,o,u)}),X}function lu(n,s,o,u,g){var y=o._reactRootContainer;if(y){var R=y;if(typeof g=="function"){var B=g;g=function(){var X=su(R);B.call(X)}}ru(s,R,n,g)}else R=xM(o,s,n,g,u);return su(R)}zt=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=At(s.pendingLanes);o!==0&&(ti(s,o|1),ai(s,ln()),(Lt&6)===0&&(Ya=ln()+500,os()))}break;case 13:ta(function(){var u=Rr(n,1);if(u!==null){var g=qn();Gi(u,n,1,g)}}),ef(n,1)}},Jt=function(n){if(n.tag===13){var s=Rr(n,134217728);if(s!==null){var o=qn();Gi(s,n,134217728,o)}ef(n,134217728)}},Fi=function(n){if(n.tag===13){var s=fs(n),o=Rr(n,s);if(o!==null){var u=qn();Gi(o,n,s,u)}ef(n,s)}},Vt=function(){return Mt},ki=function(n,s){var o=Mt;try{return Mt=n,s()}finally{Mt=o}},it=function(n,s,o){switch(s){case"input":if(qt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var g=bc(u);if(!g)throw Error(t(90));kt(u),qt(u,g)}}}break;case"textarea":mn(n,o);break;case"select":s=o.value,s!=null&&It(n,!!o.multiple,s,!1)}},Oe=$h,Me=ta;var vM={usingClientEntryPoint:!1,Events:[dl,ka,bc,Se,ke,$h]},bl={findFiberByHostInstance:$s,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},_M={bundleType:bl.bundleType,version:bl.version,rendererPackageName:bl.rendererPackageName,rendererConfig:bl.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=js(n),n===null?null:n.stateNode},findFiberByHostInstance:bl.findFiberByHostInstance||gM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var cu=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!cu.isDisabled&&cu.supportsFiber)try{oe=cu.inject(_M),De=cu}catch{}}return oi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=vM,oi.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!nf(s))throw Error(t(200));return mM(n,s,null,o)},oi.createRoot=function(n,s){if(!nf(n))throw Error(t(299));var o=!1,u="",g=dx;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(g=s.onRecoverableError)),s=Jh(n,1,!1,null,null,o,!1,u,g),n[wr]=s.current,ll(n.nodeType===8?n.parentNode:n),new tf(s)},oi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=js(s),n=n===null?null:n.stateNode,n},oi.flushSync=function(n){return ta(n)},oi.hydrate=function(n,s,o){if(!ou(s))throw Error(t(200));return lu(null,n,s,!0,o)},oi.hydrateRoot=function(n,s,o){if(!nf(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,g=!1,y="",R=dx;if(o!=null&&(o.unstable_strictMode===!0&&(g=!0),o.identifierPrefix!==void 0&&(y=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=cx(s,null,n,1,o??null,g,!1,y,R),n[wr]=s.current,ll(n),u)for(n=0;n<u.length;n++)o=u[n],g=o._getVersion,g=g(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,g]:s.mutableSourceEagerHydrationData.push(o,g);return new au(s)},oi.render=function(n,s,o){if(!ou(s))throw Error(t(200));return lu(null,n,s,!1,o)},oi.unmountComponentAtNode=function(n){if(!ou(n))throw Error(t(40));return n._reactRootContainer?(ta(function(){lu(null,null,n,!1,function(){n._reactRootContainer=null,n[wr]=null})}),!0):!1},oi.unstable_batchedUpdates=$h,oi.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!ou(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return lu(n,s,o,!1,u)},oi.version="18.3.1-next-f1338f8080-20240426",oi}var Sx;function AM(){if(Sx)return of.exports;Sx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),of.exports=RM(),of.exports}var Mx;function PM(){if(Mx)return du;Mx=1;var i=AM();return du.createRoot=i.createRoot,du.hydrateRoot=i.hydrateRoot,du}var NM=PM(),Oo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},pa,Cs,So,a_,LM=(a_=class extends Oo{constructor(){super();rt(this,pa);rt(this,Cs);rt(this,So);Be(this,So,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){G(this,Cs)||this.setEventListener(G(this,So))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,Cs))==null||e.call(this),Be(this,Cs,void 0))}setEventListener(e){var t;Be(this,So,e),(t=G(this,Cs))==null||t.call(this),Be(this,Cs,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){G(this,pa)!==e&&(Be(this,pa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof G(this,pa)=="boolean"?G(this,pa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},pa=new WeakMap,Cs=new WeakMap,So=new WeakMap,a_),pm=new LM,DM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Rs,hm,o_,IM=(o_=class{constructor(){rt(this,Rs,DM);rt(this,hm,!1)}setTimeoutProvider(i){Be(this,Rs,i)}setTimeout(i,e){return G(this,Rs).setTimeout(i,e)}clearTimeout(i){G(this,Rs).clearTimeout(i)}setInterval(i,e){return G(this,Rs).setInterval(i,e)}clearInterval(i){G(this,Rs).clearInterval(i)}},Rs=new WeakMap,hm=new WeakMap,o_),da=new IM;function UM(i){setTimeout(i,0)}var FM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function kM(i,e){return typeof i=="function"?i(e):i}function tp(i){return typeof i=="number"&&i>=0&&i!==1/0}function x_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function ks(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function Ex(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==mm(c,e.options))return!1}else if(!Vl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function wx(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ea(e.options.mutationKey)!==Ea(l))return!1}else if(!Vl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function mm(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ea)(i)}function Ea(i){return JSON.stringify(i,(e,t)=>np(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Vl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Vl(i[t],e[t])):!1}var OM=Object.prototype.hasOwnProperty;function v_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=bx(i)&&bx(e);if(!r&&!(np(i)&&np(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let x=0;x<d;x++){const p=r?x:c[x],v=i[p],_=e[p];if(v===_){h[p]=v,(r?x<l:OM.call(i,p))&&f++;continue}if(v===null||_===null||typeof v!="object"||typeof _!="object"){h[p]=_;continue}const E=v_(v,_,t+1);h[p]=E,E===v&&f++}return l===d&&f===l?i:h}function ed(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function bx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function np(i){if(!Tx(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!Tx(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function Tx(i){return Object.prototype.toString.call(i)==="[object Object]"}function zM(i){return new Promise(e=>{da.setTimeout(e,i)})}function ip(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?v_(i,e):e}function BM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function HM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var gm=Symbol();function __(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===gm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function xm(i,e){return typeof i=="function"?i(...e):!!i}function VM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Gl=(()=>{let i=()=>FM;return{isServer(){return i()},setIsServer(e){i=e}}})();function rp(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var GM=UM;function jM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=GM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var Mn=jM(),Mo,As,Eo,l_,WM=(l_=class extends Oo{constructor(){super();rt(this,Mo,!0);rt(this,As);rt(this,Eo);Be(this,Eo,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){G(this,As)||this.setEventListener(G(this,Eo))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,As))==null||e.call(this),Be(this,As,void 0))}setEventListener(e){var t;Be(this,Eo,e),(t=G(this,As))==null||t.call(this),Be(this,As,e(this.setOnline.bind(this)))}setOnline(e){G(this,Mo)!==e&&(Be(this,Mo,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return G(this,Mo)}},Mo=new WeakMap,As=new WeakMap,Eo=new WeakMap,l_),td=new WM;function XM(i){return Math.min(1e3*2**i,3e4)}function y_(i){return(i??"online")==="online"?td.isOnline():!0}var sp=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function S_(i){let e=!1,t=0,r;const a=rp(),l=()=>a.status!=="pending",c=w=>{var M;if(!l()){const S=new sp(w);v(S),(M=i.onCancel)==null||M.call(i,S)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>pm.isFocused()&&(i.networkMode==="always"||td.isOnline())&&i.canRun(),x=()=>y_(i.networkMode)&&i.canRun(),p=w=>{l()||(r==null||r(),a.resolve(w))},v=w=>{l()||(r==null||r(),a.reject(w))},_=()=>new Promise(w=>{var M;r=S=>{(l()||f())&&w(S)},(M=i.onPause)==null||M.call(i)}).then(()=>{var w;r=void 0,l()||(w=i.onContinue)==null||w.call(i)}),E=()=>{if(l())return;let w;const M=t===0?i.initialPromise:void 0;try{w=M??i.fn()}catch(S){w=Promise.reject(S)}Promise.resolve(w).then(p).catch(S=>{var N;if(l())return;const A=i.retry??(Gl.isServer()?0:3),L=i.retryDelay??XM,C=typeof L=="function"?L(t,S):L,I=A===!0||typeof A=="number"&&t<A||typeof A=="function"&&A(t,S);if(e||!I){v(S);return}t++,(N=i.onFail)==null||N.call(i,t,S),zM(C).then(()=>f()?void 0:_()).then(()=>{e?v(S):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:x,start:()=>(x()?E():_().then(E),a)}}var ma,c_,M_=(c_=class{constructor(){rt(this,ma)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),tp(this.gcTime)&&Be(this,ma,da.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Gl.isServer()?1/0:300*1e3))}clearGcTimeout(){G(this,ma)!==void 0&&(da.clearTimeout(G(this,ma)),Be(this,ma,void 0))}},ma=new WeakMap,c_);function $M(i){return{onFetch:(e,t)=>{var x,p,v,_,E;const r=e.options,a=(v=(p=(x=e.fetchOptions)==null?void 0:x.meta)==null?void 0:p.fetchMore)==null?void 0:v.direction,l=((_=e.state.data)==null?void 0:_.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let w=!1;const M=L=>{VM(L,()=>e.signal,()=>w=!0)},S=__(e.options,e.fetchOptions),A=async(L,C,I)=>{if(w)return Promise.reject(e.signal.reason);if(C==null&&L.pages.length)return Promise.resolve(L);const U=(()=>{const V={client:e.client,queryKey:e.queryKey,pageParam:C,direction:I?"backward":"forward",meta:e.options.meta};return M(V),V})(),b=await S(U),{maxPages:D}=e.options,O=I?HM:BM;return{pages:O(L.pages,b,D),pageParams:O(L.pageParams,C,D)}};if(a&&l.length){const L=a==="backward",C=L?qM:Cx,I={pages:l,pageParams:c},N=C(r,I);d=await A(I,N,L)}else{const L=i??l.length;do{const C=h===0?c[0]??r.initialPageParam:Cx(r,d);if(h>0&&C==null)break;d=await A(d,C),h++}while(h<L)}return d};e.options.persister?e.fetchFn=()=>{var w,M;return(M=(w=e.options).persister)==null?void 0:M.call(w,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function Cx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function qM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var wo,ga,bo,Di,xa,Pn,Yl,va,_i,E_,Or,u_,KM=(u_=class extends M_{constructor(e){super();rt(this,_i);rt(this,wo);rt(this,ga);rt(this,bo);rt(this,Di);rt(this,xa);rt(this,Pn);rt(this,Yl);rt(this,va);Be(this,va,!1),Be(this,Yl,e.defaultOptions),this.setOptions(e.options),this.observers=[],Be(this,xa,e.client),Be(this,Di,G(this,xa).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,Be(this,ga,Ax(this.options)),this.state=e.state??G(this,ga),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return G(this,wo)}get promise(){var e;return(e=G(this,Pn))==null?void 0:e.promise}setOptions(e){if(this.options={...G(this,Yl),...e},e!=null&&e._type&&Be(this,wo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Ax(this.options);t.data!==void 0&&(this.setState(Rx(t.data,t.dataUpdatedAt)),Be(this,ga,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&G(this,Di).remove(this)}setData(e,t){const r=ip(this.state.data,e,this.options);return xt(this,_i,Or).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){xt(this,_i,Or).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=G(this,Pn))==null?void 0:r.promise;return(a=G(this,Pn))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return G(this,ga)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===gm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>ks(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!x_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,Pn))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,Pn))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),G(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(G(this,Pn)&&(G(this,va)||xt(this,_i,E_).call(this)?G(this,Pn).cancel({revert:!0}):G(this,Pn).cancelRetry()),this.scheduleGc()),G(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||xt(this,_i,Or).call(this,{type:"invalidate"})}async fetch(e,t){var f,x,p,v,_,E,w,M,S,A,L;if(this.state.fetchStatus!=="idle"&&((f=G(this,Pn))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(G(this,Pn))return G(this,Pn).continueRetry(),G(this,Pn).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(I=>I.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(Be(this,va,!0),r.signal)})},l=()=>{const C=__(this.options,t),N=(()=>{const U={client:G(this,xa),queryKey:this.queryKey,meta:this.meta};return a(U),U})();return Be(this,va,!1),this.options.persister?this.options.persister(C,N,this):C(N)},d=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:G(this,xa),state:this.state,fetchFn:l};return a(C),C})(),h=G(this,wo)==="infinite"?$M(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),Be(this,bo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((x=d.fetchOptions)==null?void 0:x.meta))&&xt(this,_i,Or).call(this,{type:"fetch",meta:(p=d.fetchOptions)==null?void 0:p.meta}),Be(this,Pn,S_({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:C=>{C instanceof sp&&C.revert&&this.setState({...G(this,bo),fetchStatus:"idle"}),r.abort()},onFail:(C,I)=>{xt(this,_i,Or).call(this,{type:"failed",failureCount:C,error:I})},onPause:()=>{xt(this,_i,Or).call(this,{type:"pause"})},onContinue:()=>{xt(this,_i,Or).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const C=await G(this,Pn).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(_=(v=G(this,Di).config).onSuccess)==null||_.call(v,C,this),(w=(E=G(this,Di).config).onSettled)==null||w.call(E,C,this.state.error,this),C}catch(C){if(C instanceof sp){if(C.silent)return G(this,Pn).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw xt(this,_i,Or).call(this,{type:"error",error:C}),(S=(M=G(this,Di).config).onError)==null||S.call(M,C,this),(L=(A=G(this,Di).config).onSettled)==null||L.call(A,this.state.data,C,this),C}finally{this.scheduleGc()}}},wo=new WeakMap,ga=new WeakMap,bo=new WeakMap,Di=new WeakMap,xa=new WeakMap,Pn=new WeakMap,Yl=new WeakMap,va=new WeakMap,_i=new WeakSet,E_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},Or=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...w_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...Rx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return Be(this,bo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Mn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),G(this,Di).notify({query:this,type:"updated",action:e})})},u_);function w_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:y_(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function Rx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Ax(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ui,Tt,Ql,Qn,_a,To,zr,Ps,Zl,Co,Ro,ya,Sa,Ns,Ao,Bt,Fl,ap,op,lp,cp,up,dp,hp,b_,d_,YM=(d_=class extends Oo{constructor(e,t){super();rt(this,Bt);rt(this,ui);rt(this,Tt);rt(this,Ql);rt(this,Qn);rt(this,_a);rt(this,To);rt(this,zr);rt(this,Ps);rt(this,Zl);rt(this,Co);rt(this,Ro);rt(this,ya);rt(this,Sa);rt(this,Ns);rt(this,Ao,new Set);this.options=t,Be(this,ui,e),Be(this,Ps,null),Be(this,zr,rp()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(G(this,Tt).addObserver(this),Px(G(this,Tt),this.options)?xt(this,Bt,Fl).call(this):this.updateResult(),xt(this,Bt,cp).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return fp(G(this,Tt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return fp(G(this,Tt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,xt(this,Bt,up).call(this),xt(this,Bt,dp).call(this),G(this,Tt).removeObserver(this)}setOptions(e){const t=this.options,r=G(this,Tt);if(this.options=G(this,ui).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,G(this,Tt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");xt(this,Bt,hp).call(this),G(this,Tt).setOptions(this.options),t._defaulted&&!ed(this.options,t)&&G(this,ui).getQueryCache().notify({type:"observerOptionsUpdated",query:G(this,Tt),observer:this});const a=this.hasListeners();a&&Nx(G(this,Tt),r,this.options,t)&&xt(this,Bt,Fl).call(this),this.updateResult(),a&&(G(this,Tt)!==r||yi(this.options.enabled,G(this,Tt))!==yi(t.enabled,G(this,Tt))||ks(this.options.staleTime,G(this,Tt))!==ks(t.staleTime,G(this,Tt)))&&xt(this,Bt,ap).call(this);const l=xt(this,Bt,op).call(this);a&&(G(this,Tt)!==r||yi(this.options.enabled,G(this,Tt))!==yi(t.enabled,G(this,Tt))||l!==G(this,Ns))&&xt(this,Bt,lp).call(this,l)}getOptimisticResult(e){const t=G(this,ui).getQueryCache().build(G(this,ui),e),r=this.createResult(t,e);return ZM(this,r)&&(Be(this,Qn,r),Be(this,To,this.options),Be(this,_a,G(this,Tt).state)),r}getCurrentResult(){return G(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&G(this,zr).status==="pending"&&G(this,zr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){G(this,Ao).add(e)}getCurrentQuery(){return G(this,Tt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=G(this,ui).defaultQueryOptions(e),r=G(this,ui).getQueryCache().build(G(this,ui),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return xt(this,Bt,Fl).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),G(this,Qn)))}createResult(e,t){var D;const r=G(this,Tt),a=this.options,l=G(this,Qn),c=G(this,_a),d=G(this,To),f=e!==r?e.state:G(this,Ql),{state:x}=e;let p={...x},v=!1,_;if(t._optimisticResults){const O=this.hasListeners(),V=!O&&Px(e,t),W=O&&Nx(e,r,t,a);(V||W)&&(p={...p,...w_(x.data,e.options)}),t._optimisticResults==="isRestoring"&&(p.fetchStatus="idle")}let{error:E,errorUpdatedAt:w,status:M}=p;_=p.data;let S=!1;if(t.placeholderData!==void 0&&_===void 0&&M==="pending"){let O;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(O=l.data,S=!0):O=typeof t.placeholderData=="function"?t.placeholderData((D=G(this,Ro))==null?void 0:D.state.data,G(this,Ro)):t.placeholderData,O!==void 0&&(M="success",_=ip(l==null?void 0:l.data,O,t),v=!0)}if(t.select&&_!==void 0&&!S)if(l&&_===(c==null?void 0:c.data)&&t.select===G(this,Zl))_=G(this,Co);else try{Be(this,Zl,t.select),_=t.select(_),_=ip(l==null?void 0:l.data,_,t),Be(this,Co,_),Be(this,Ps,null)}catch(O){Be(this,Ps,O)}G(this,Ps)&&(E=G(this,Ps),_=G(this,Co),w=Date.now(),M="error");const A=p.fetchStatus==="fetching",L=M==="pending",C=M==="error",I=L&&A,N=_!==void 0,b={status:M,fetchStatus:p.fetchStatus,isPending:L,isSuccess:M==="success",isError:C,isInitialLoading:I,isLoading:I,data:_,dataUpdatedAt:p.dataUpdatedAt,error:E,errorUpdatedAt:w,failureCount:p.fetchFailureCount,failureReason:p.fetchFailureReason,errorUpdateCount:p.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:p.dataUpdateCount>f.dataUpdateCount||p.errorUpdateCount>f.errorUpdateCount,isFetching:A,isRefetching:A&&!L,isLoadingError:C&&!N,isPaused:p.fetchStatus==="paused",isPlaceholderData:v,isRefetchError:C&&N,isStale:vm(e,t),refetch:this.refetch,promise:G(this,zr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const O=b.data!==void 0,V=b.status==="error"&&!O,W=q=>{V?q.reject(b.error):O&&q.resolve(b.data)},j=()=>{const q=Be(this,zr,b.promise=rp());W(q)},ue=G(this,zr);switch(ue.status){case"pending":e.queryHash===r.queryHash&&W(ue);break;case"fulfilled":(V||b.data!==ue.value)&&j();break;case"rejected":(!V||b.error!==ue.reason)&&j();break}}return b}updateResult(){const e=G(this,Qn),t=this.createResult(G(this,Tt),this.options);if(Be(this,_a,G(this,Tt).state),Be(this,To,this.options),G(this,_a).data!==void 0&&Be(this,Ro,G(this,Tt)),ed(t,e))return;Be(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!G(this,Ao).size)return!0;const c=new Set(l??G(this,Ao));return this.options.throwOnError&&c.add("error"),Object.keys(G(this,Qn)).some(d=>{const h=d;return G(this,Qn)[h]!==e[h]&&c.has(h)})};xt(this,Bt,b_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&xt(this,Bt,cp).call(this)}},ui=new WeakMap,Tt=new WeakMap,Ql=new WeakMap,Qn=new WeakMap,_a=new WeakMap,To=new WeakMap,zr=new WeakMap,Ps=new WeakMap,Zl=new WeakMap,Co=new WeakMap,Ro=new WeakMap,ya=new WeakMap,Sa=new WeakMap,Ns=new WeakMap,Ao=new WeakMap,Bt=new WeakSet,Fl=function(e){xt(this,Bt,hp).call(this);let t=G(this,Tt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},ap=function(){xt(this,Bt,up).call(this);const e=ks(this.options.staleTime,G(this,Tt));if(Gl.isServer()||G(this,Qn).isStale||!tp(e))return;const r=x_(G(this,Qn).dataUpdatedAt,e)+1;Be(this,ya,da.setTimeout(()=>{G(this,Qn).isStale||this.updateResult()},r))},op=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(G(this,Tt)):this.options.refetchInterval)??!1},lp=function(e){xt(this,Bt,dp).call(this),Be(this,Ns,e),!(Gl.isServer()||yi(this.options.enabled,G(this,Tt))===!1||!tp(G(this,Ns))||G(this,Ns)===0)&&Be(this,Sa,da.setInterval(()=>{(this.options.refetchIntervalInBackground||pm.isFocused())&&xt(this,Bt,Fl).call(this)},G(this,Ns)))},cp=function(){xt(this,Bt,ap).call(this),xt(this,Bt,lp).call(this,xt(this,Bt,op).call(this))},up=function(){G(this,ya)!==void 0&&(da.clearTimeout(G(this,ya)),Be(this,ya,void 0))},dp=function(){G(this,Sa)!==void 0&&(da.clearInterval(G(this,Sa)),Be(this,Sa,void 0))},hp=function(){const e=G(this,ui).getQueryCache().build(G(this,ui),this.options);if(e===G(this,Tt))return;const t=G(this,Tt);Be(this,Tt,e),Be(this,Ql,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},b_=function(e){Mn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(G(this,Qn))}),G(this,ui).getQueryCache().notify({query:G(this,Tt),type:"observerResultsUpdated"})})},d_);function QM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Px(i,e){return QM(i,e)||i.state.data!==void 0&&fp(i,e,e.refetchOnMount)}function fp(i,e,t){if(yi(e.enabled,i)!==!1&&ks(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&vm(i,e)}return!1}function Nx(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&vm(i,t)}function vm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(ks(e.staleTime,i))}function ZM(i,e){return!ed(i.getCurrentResult(),e)}var Jl,or,Gn,Ma,lr,ws,h_,JM=(h_=class extends M_{constructor(e){super();rt(this,lr);rt(this,Jl);rt(this,or);rt(this,Gn);rt(this,Ma);Be(this,Jl,e.client),this.mutationId=e.mutationId,Be(this,Gn,e.mutationCache),Be(this,or,[]),this.state=e.state||T_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){G(this,or).includes(e)||(G(this,or).push(e),this.clearGcTimeout(),G(this,Gn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){Be(this,or,G(this,or).filter(t=>t!==e)),this.scheduleGc(),G(this,Gn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){G(this,or).length||(this.state.status==="pending"?this.scheduleGc():G(this,Gn).remove(this))}continue(){var e;return((e=G(this,Ma))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,x,p,v,_,E,w,M,S,A,L,C,I,N,U;const t=()=>{xt(this,lr,ws).call(this,{type:"continue"})},r={client:G(this,Jl),meta:this.options.meta,mutationKey:this.options.mutationKey};Be(this,Ma,S_({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(b,D)=>{xt(this,lr,ws).call(this,{type:"failed",failureCount:b,error:D})},onPause:()=>{xt(this,lr,ws).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>G(this,Gn).canRun(this)}));const a=this.state.status==="pending",l=!G(this,Ma).canStart();try{if(a)t();else{xt(this,lr,ws).call(this,{type:"pending",variables:e,isPaused:l}),G(this,Gn).config.onMutate&&await G(this,Gn).config.onMutate(e,this,r);const D=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));D!==this.state.context&&xt(this,lr,ws).call(this,{type:"pending",context:D,variables:e,isPaused:l})}const b=await G(this,Ma).start();return await((f=(h=G(this,Gn).config).onSuccess)==null?void 0:f.call(h,b,e,this.state.context,this,r)),await((p=(x=this.options).onSuccess)==null?void 0:p.call(x,b,e,this.state.context,r)),await((_=(v=G(this,Gn).config).onSettled)==null?void 0:_.call(v,b,null,this.state.variables,this.state.context,this,r)),await((w=(E=this.options).onSettled)==null?void 0:w.call(E,b,null,e,this.state.context,r)),xt(this,lr,ws).call(this,{type:"success",data:b}),b}catch(b){try{await((S=(M=G(this,Gn).config).onError)==null?void 0:S.call(M,b,e,this.state.context,this,r))}catch(D){Promise.reject(D)}try{await((L=(A=this.options).onError)==null?void 0:L.call(A,b,e,this.state.context,r))}catch(D){Promise.reject(D)}try{await((I=(C=G(this,Gn).config).onSettled)==null?void 0:I.call(C,void 0,b,this.state.variables,this.state.context,this,r))}catch(D){Promise.reject(D)}try{await((U=(N=this.options).onSettled)==null?void 0:U.call(N,void 0,b,e,this.state.context,r))}catch(D){Promise.reject(D)}throw xt(this,lr,ws).call(this,{type:"error",error:b}),b}finally{G(this,Gn).runNext(this)}}},Jl=new WeakMap,or=new WeakMap,Gn=new WeakMap,Ma=new WeakMap,lr=new WeakSet,ws=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Mn.batch(()=>{G(this,or).forEach(r=>{r.onMutationUpdate(e)}),G(this,Gn).notify({mutation:this,type:"updated",action:e})})},h_);function T_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var Br,$i,ec,f_,eE=(f_=class extends Oo{constructor(e={}){super();rt(this,Br);rt(this,$i);rt(this,ec);this.config=e,Be(this,Br,new Set),Be(this,$i,new Map),Be(this,ec,0)}build(e,t,r){const a=new JM({client:e,mutationCache:this,mutationId:++uu(this,ec)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){G(this,Br).add(e);const t=hu(e);if(typeof t=="string"){const r=G(this,$i).get(t);r?r.push(e):G(this,$i).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(G(this,Br).delete(e)){const t=hu(e);if(typeof t=="string"){const r=G(this,$i).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&G(this,$i).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=hu(e);if(typeof t=="string"){const r=G(this,$i).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=hu(e);if(typeof t=="string"){const a=(r=G(this,$i).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Mn.batch(()=>{G(this,Br).forEach(e=>{this.notify({type:"removed",mutation:e})}),G(this,Br).clear(),G(this,$i).clear()})}getAll(){return Array.from(G(this,Br))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>wx(t,r))}findAll(e={}){return this.getAll().filter(t=>wx(e,t))}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Mn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},Br=new WeakMap,$i=new WeakMap,ec=new WeakMap,f_);function hu(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Hr,Ls,di,Vr,$r,Gu,pp,p_,tE=(p_=class extends Oo{constructor(t,r){super();rt(this,$r);rt(this,Hr);rt(this,Ls);rt(this,di);rt(this,Vr);Be(this,Hr,t),this.setOptions(r),this.bindMethods(),xt(this,$r,Gu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=G(this,Hr).defaultMutationOptions(t),ed(this.options,r)||G(this,Hr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:G(this,di),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ea(r.mutationKey)!==Ea(this.options.mutationKey)?this.reset():((a=G(this,di))==null?void 0:a.state.status)==="pending"&&G(this,di).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=G(this,di))==null||t.removeObserver(this)}onMutationUpdate(t){xt(this,$r,Gu).call(this),xt(this,$r,pp).call(this,t)}getCurrentResult(){return G(this,Ls)}reset(){var t;(t=G(this,di))==null||t.removeObserver(this),Be(this,di,void 0),xt(this,$r,Gu).call(this),xt(this,$r,pp).call(this)}mutate(t,r){var a;return Be(this,Vr,r),(a=G(this,di))==null||a.removeObserver(this),Be(this,di,G(this,Hr).getMutationCache().build(G(this,Hr),this.options)),G(this,di).addObserver(this),G(this,di).execute(t)}},Hr=new WeakMap,Ls=new WeakMap,di=new WeakMap,Vr=new WeakMap,$r=new WeakSet,Gu=function(){var r;const t=((r=G(this,di))==null?void 0:r.state)??T_();Be(this,Ls,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},pp=function(t){Mn.batch(()=>{var r,a,l,c,d,h,f,x;if(G(this,Vr)&&this.hasListeners()){const p=G(this,Ls).variables,v=G(this,Ls).context,_={client:G(this,Hr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=G(this,Vr)).onSuccess)==null||a.call(r,t.data,p,v,_)}catch(E){Promise.reject(E)}try{(c=(l=G(this,Vr)).onSettled)==null||c.call(l,t.data,null,p,v,_)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=G(this,Vr)).onError)==null||h.call(d,t.error,p,v,_)}catch(E){Promise.reject(E)}try{(x=(f=G(this,Vr)).onSettled)==null||x.call(f,void 0,t.error,p,v,_)}catch(E){Promise.reject(E)}}}this.listeners.forEach(p=>{p(G(this,Ls))})})},p_),cr,m_,nE=(m_=class extends Oo{constructor(e={}){super();rt(this,cr);this.config=e,Be(this,cr,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??mm(a,t);let c=this.get(l);return c||(c=new KM({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){G(this,cr).has(e.queryHash)||(G(this,cr).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=G(this,cr).get(e.queryHash);t&&(e.destroy(),t===e&&G(this,cr).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Mn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return G(this,cr).get(e)}getAll(){return[...G(this,cr).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Ex(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>Ex(e,r)):t}notify(e){Mn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Mn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},cr=new WeakMap,m_),fn,Ds,Is,Po,No,Us,Lo,Do,g_,iE=(g_=class{constructor(i={}){rt(this,fn);rt(this,Ds);rt(this,Is);rt(this,Po);rt(this,No);rt(this,Us);rt(this,Lo);rt(this,Do);Be(this,fn,i.queryCache||new nE),Be(this,Ds,i.mutationCache||new eE),Be(this,Is,i.defaultOptions||{}),Be(this,Po,new Map),Be(this,No,new Map),Be(this,Us,0)}mount(){uu(this,Us)._++,G(this,Us)===1&&(Be(this,Lo,pm.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,fn).onFocus())})),Be(this,Do,td.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,fn).onOnline())})))}unmount(){var i,e;uu(this,Us)._--,G(this,Us)===0&&((i=G(this,Lo))==null||i.call(this),Be(this,Lo,void 0),(e=G(this,Do))==null||e.call(this),Be(this,Do,void 0))}isFetching(i){return G(this,fn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return G(this,Ds).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,fn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=G(this,fn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(ks(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return G(this,fn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=G(this,fn).get(r.queryHash),l=a==null?void 0:a.state.data,c=kM(e,l);if(c!==void 0)return G(this,fn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Mn.batch(()=>G(this,fn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,fn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=G(this,fn);Mn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=G(this,fn);return Mn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Mn.batch(()=>G(this,fn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return Mn.batch(()=>(G(this,fn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Mn.batch(()=>G(this,fn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=G(this,fn).build(this,e);return t.isStaleByTime(ks(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return td.isOnline()?G(this,Ds).resumePausedMutations():Promise.resolve()}getQueryCache(){return G(this,fn)}getMutationCache(){return G(this,Ds)}getDefaultOptions(){return G(this,Is)}setDefaultOptions(i){Be(this,Is,i)}setQueryDefaults(i,e){G(this,Po).set(Ea(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...G(this,Po).values()],t={};return e.forEach(r=>{Vl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){G(this,No).set(Ea(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...G(this,No).values()],t={};return e.forEach(r=>{Vl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...G(this,Is).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=mm(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===gm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...G(this,Is).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){G(this,fn).clear(),G(this,Ds).clear()}},fn=new WeakMap,Ds=new WeakMap,Is=new WeakMap,Po=new WeakMap,No=new WeakMap,Us=new WeakMap,Lo=new WeakMap,Do=new WeakMap,g_),C_=k.createContext(void 0),pd=i=>{const e=k.useContext(C_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},rE=({client:i,children:e})=>(k.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),m.jsx(C_.Provider,{value:i,children:e})),R_=k.createContext(!1),sE=()=>k.useContext(R_);R_.Provider;function aE(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var oE=k.createContext(aE()),lE=()=>k.useContext(oE),cE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?xm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},uE=i=>{k.useEffect(()=>{i.clearReset()},[i])},dE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||xm(t,[i.error,r])),hE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},fE=(i,e)=>i.isLoading&&i.isFetching&&!e,pE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Lx=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function mE(i,e,t){var _,E,w,M;const r=sE(),a=lE(),l=pd(),c=l.defaultQueryOptions(i);(E=(_=l.getDefaultOptions().queries)==null?void 0:_._experimental_beforeQuery)==null||E.call(_,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,hE(c),cE(c,a,d),uE(a);const f=!l.getQueryCache().get(c.queryHash),[x]=k.useState(()=>new e(l,c)),p=x.getOptimisticResult(c),v=!r&&h;if(k.useSyncExternalStore(k.useCallback(S=>{const A=v?x.subscribe(Mn.batchCalls(S)):Zn;return x.updateResult(),A},[x,v]),()=>x.getCurrentResult(),()=>x.getCurrentResult()),k.useEffect(()=>{x.setOptions(c)},[c,x]),pE(c,p))throw Lx(c,x,a);if(dE({result:p,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw p.error;if((M=(w=l.getDefaultOptions().queries)==null?void 0:w._experimental_afterQuery)==null||M.call(w,c,p),c.experimental_prefetchInRender&&!Gl.isServer()&&fE(p,r)){const S=f?Lx(c,x,a):d==null?void 0:d.promise;S==null||S.catch(Zn).finally(()=>{x.updateResult()})}return c.notifyOnChangeProps?p:x.trackResult(p)}function gr(i,e){return mE(i,YM)}function Gr(i,e){const t=pd(),[r]=k.useState(()=>new tE(t,i));k.useEffect(()=>{r.setOptions(i)},[r,i]);const a=k.useSyncExternalStore(k.useCallback(c=>r.subscribe(Mn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=k.useCallback((c,d)=>{r.mutate(c,d).catch(Zn)},[r]);if(a.error&&xm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var _m=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,A_=/^[\\/]{2}/;function gE(i,e){return e+i.replace(/\\/g,"/")}var Dx="popstate";function Ix(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function xE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return mp("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:jl(a)}return _E(e,t,null,i)}function an(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function vE(){return Math.random().toString(36).substring(2,10)}function Ux(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function mp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?zo(e):e,state:t,key:e&&e.key||r||vE(),mask:a}}function jl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function zo(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function _E(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=x();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function x(){return(c.state||{idx:null}).idx}function p(){d="POP";let M=x(),S=M==null?null:M-f;f=M,h&&h({action:d,location:w.location,delta:S})}function v(M,S){d="PUSH";let A=Ix(M)?M:mp(w.location,M,S);f=x()+1;let L=Ux(A,f),C=w.createHref(A.mask||A);try{c.pushState(L,"",C)}catch(I){if(I instanceof DOMException&&I.name==="DataCloneError")throw I;a.location.assign(C)}l&&h&&h({action:d,location:w.location,delta:1})}function _(M,S){d="REPLACE";let A=Ix(M)?M:mp(w.location,M,S);f=x();let L=Ux(A,f),C=w.createHref(A.mask||A);c.replaceState(L,"",C),l&&h&&h({action:d,location:w.location,delta:0})}function E(M){return yE(a,M)}let w={get action(){return d},get location(){return i(a,c)},listen(M){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Dx,p),h=M,()=>{a.removeEventListener(Dx,p),h=null}},createHref(M){return e(a,M)},createURL:E,encodeLocation(M){let S=E(M);return{pathname:S.pathname,search:S.search,hash:S.hash}},push:v,replace:_,go(M){return c.go(M)}};return w}function yE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),an(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:jl(e);return a=a.replace(/ $/,"%20"),!t&&A_.test(a)&&(a=r+a),new URL(a,r)}function P_(i,e,t="/"){return SE(i,e,t,!1)}function SE(i,e,t,r,a){let l=typeof e=="string"?zo(e):e,c=qr(l.pathname||"/",t);if(c==null)return null;let d=ME(i),h=null,f=DE(c);for(let x=0;h==null&&x<d.length;++x)h=LE(d[x],f,r);return h}function ME(i){let e=N_(i);return EE(e),e}function N_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let x={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(x.relativePath.startsWith("/")){if(!x.relativePath.startsWith(r)&&h)return;an(x.relativePath.startsWith(r),`Absolute route path "${x.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),x.relativePath=x.relativePath.slice(r.length)}let p=Yi([r,x.relativePath]),v=t.concat(x);c.children&&c.children.length>0&&(an(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${p}".`),N_(c.children,e,v,p,h)),!(c.path==null&&!c.index)&&e.push({path:p,score:PE(p,c.index),routesMeta:v.map((_,E)=>{let[w,M]=I_(_.relativePath,_.caseSensitive,E===v.length-1);return{..._,matcher:w,compiledParams:M}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of L_(c.path))l(c,d,!0,f)}),e}function L_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=L_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function EE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:NE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var wE=/^:[\w-]+$/,bE=3,TE=2,CE=1,RE=10,AE=-2,Fx=i=>i==="*";function PE(i,e){let t=i.split("/"),r=t.length;return t.some(Fx)&&(r+=AE),e&&(r+=TE),t.filter(a=>!Fx(a)).reduce((a,l)=>a+(wE.test(l)?bE:l===""?CE:RE),r)}function NE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function LE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,x=l==="/"?e:e.slice(l.length)||"/",p={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},v=h.matcher&&h.compiledParams?D_(p,x,h.matcher,h.compiledParams):nd(p,x),_=h.route;if(!v&&f&&t&&!r[r.length-1].route.index&&(v=nd({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},x)),!v)return null;Object.assign(a,v.params),c.push({params:a,pathname:Yi([l,v.pathname]),pathnameBase:FE(Yi([l,v.pathnameBase])),route:_}),v.pathnameBase!=="/"&&(l=Yi([l,v.pathnameBase]))}return c}function nd(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=I_(i.path,i.caseSensitive,i.end);return D_(i,e,t,r)}function D_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:x,isOptional:p},v)=>{if(x==="*"){let E=d[v]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const _=d[v];return p&&!_?f[x]=void 0:f[x]=(_||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function I_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,x)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let p=x.charAt(f+c.length);return p&&p!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function DE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function qr(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function IE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?zo(i):i,l;return t?(t=U_(t),t.startsWith("/")?l=kx(t.substring(1),"/"):l=kx(t,e)):l=e,{pathname:l,search:kE(r),hash:OE(a)}}function kx(i,e){let t=id(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function uf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function UE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function ym(i){let e=UE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function md(i,e,t,r=!1){let a;typeof i=="string"?a=zo(i):(a={...i},an(!a.pathname||!a.pathname.includes("?"),uf("?","pathname","search",a)),an(!a.pathname||!a.pathname.includes("#"),uf("#","pathname","hash",a)),an(!a.search||!a.search.includes("#"),uf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let p=e.length-1;if(!r&&c.startsWith("..")){let v=c.split("/");for(;v[0]==="..";)v.shift(),p-=1;a.pathname=v.join("/")}d=p>=0?e[p]:"/"}let h=IE(a,d),f=c&&c!=="/"&&c.endsWith("/"),x=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||x)&&(h.pathname+="/"),h}var U_=i=>i.replace(/[\\/]{2,}/g,"/"),Yi=i=>U_(i.join("/")),id=i=>i.replace(/\/+$/,""),FE=i=>id(i).replace(/^\/*/,"/"),kE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,OE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,zE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function BE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function HE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Yi(e)||"/"}var F_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function k_(i,e){let t=i;if(typeof t!="string"||!_m.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(F_)try{let l=new URL(window.location.href),c=A_.test(t)?new URL(gE(t,l.protocol)):new URL(t),d=qr(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var O_=["POST","PUT","PATCH","DELETE"];new Set(O_);var VE=["GET",...O_];new Set(VE);var GE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function jE(i){try{return GE.includes(new URL(i).protocol)}catch{return!1}}var Bo=k.createContext(null);Bo.displayName="DataRouter";var gd=k.createContext(null);gd.displayName="DataRouterState";var z_=k.createContext(!1);function WE(){return k.useContext(z_)}var B_=k.createContext({isTransitioning:!1});B_.displayName="ViewTransition";var XE=k.createContext(new Map);XE.displayName="Fetchers";var $E=k.createContext(null);$E.displayName="Await";var Ei=k.createContext(null);Ei.displayName="Navigation";var tc=k.createContext(null);tc.displayName="Location";var Zi=k.createContext({outlet:null,matches:[],isDataRoute:!1});Zi.displayName="Route";var Sm=k.createContext(null);Sm.displayName="RouteError";var H_="REACT_ROUTER_ERROR",qE="REDIRECT",KE="ROUTE_ERROR_RESPONSE";function YE(i){if(i.startsWith(`${H_}:${qE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function QE(i){if(i.startsWith(`${H_}:${KE}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new zE(e.status,e.statusText,e.data)}catch{}}function ZE(i,{relative:e}={}){an(Ho(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=k.useContext(Ei),{hash:a,pathname:l,search:c}=nc(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Yi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function Ho(){return k.useContext(tc)!=null}function Ji(){return an(Ho(),"useLocation() may be used only in the context of a <Router> component."),k.useContext(tc).location}var V_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function G_(i){k.useContext(Ei).static||k.useLayoutEffect(i)}function Mm(){let{isDataRoute:i}=k.useContext(Zi);return i?f1():JE()}function JE(){an(Ho(),"useNavigate() may be used only in the context of a <Router> component.");let i=k.useContext(Bo),{basename:e,navigator:t}=k.useContext(Ei),{matches:r}=k.useContext(Zi),{pathname:a}=Ji(),l=JSON.stringify(ym(r)),c=k.useRef(!1);return G_(()=>{c.current=!0}),k.useCallback((h,f={})=>{if(Ui(c.current,V_),!c.current)return;if(typeof h=="number"){t.go(h);return}let x=md(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(x.pathname=x.pathname==="/"?e:Yi([e,x.pathname])),(f.replace?t.replace:t.push)(x,f.state,f)},[e,t,l,a,i])}var e1=k.createContext(null);function t1(i){let e=k.useContext(Zi).outlet;return k.useMemo(()=>e&&k.createElement(e1.Provider,{value:i},e),[e,i])}function nc(i,{relative:e}={}){let{matches:t}=k.useContext(Zi),{pathname:r}=Ji(),a=JSON.stringify(ym(t));return k.useMemo(()=>md(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function n1(i,e){return j_(i,e)}function j_(i,e,t){var M;an(Ho(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=k.useContext(Ei),{matches:a}=k.useContext(Zi),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let S=f&&f.path||"";X_(d,!f||S.endsWith("*")||S.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${S}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${S}"> to <Route path="${S==="/"?"*":`${S}/*`}">.`)}let x=Ji(),p;if(e){let S=typeof e=="string"?zo(e):e;an(h==="/"||((M=S.pathname)==null?void 0:M.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${S.pathname}" was given in the \`location\` prop.`),p=S}else p=x;let v=p.pathname||"/",_=v;if(h!=="/"){let S=h.replace(/^\//,"").split("/");_="/"+v.replace(/^\//,"").split("/").slice(S.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(S=>Object.assign(S,{route:t.manifest[S.route.id]||S.route})):P_(i,{pathname:_});Ui(f||E!=null,`No routes matched location "${p.pathname}${p.search}${p.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${p.pathname}${p.search}${p.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let w=o1(E&&E.map(S=>Object.assign({},S,{params:Object.assign({},c,S.params),pathname:Yi([h,r.encodeLocation?r.encodeLocation(S.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathname]),pathnameBase:S.pathnameBase==="/"?h:Yi([h,r.encodeLocation?r.encodeLocation(S.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathnameBase])})),a,t);return e&&w?k.createElement(tc.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...p},navigationType:"POP"}},w):w}function i1(){let i=h1(),e=BE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=k.createElement(k.Fragment,null,k.createElement("p",null,"💿 Hey developer 👋"),k.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",k.createElement("code",{style:l},"ErrorBoundary")," or"," ",k.createElement("code",{style:l},"errorElement")," prop on your route.")),k.createElement(k.Fragment,null,k.createElement("h2",null,"Unexpected Application Error!"),k.createElement("h3",{style:{fontStyle:"italic"}},e),t?k.createElement("pre",{style:a},t):null,c)}var r1=k.createElement(i1,null),W_=class extends k.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=QE(i.digest);t&&(i=t)}let e=i!==void 0?k.createElement(Zi.Provider,{value:this.props.routeContext},k.createElement(Sm.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?k.createElement(s1,{error:i},e):e}};W_.contextType=z_;var df=new WeakMap;function s1({children:i,error:e}){let{basename:t}=k.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=YE(e.digest);if(r){let a=df.get(e);if(a)throw a;let l=k_(r.location,t),c=l.absoluteURL||l.to;if(jE(c))throw new Error("Invalid redirect location");if(F_&&!df.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw df.set(e,d),d}return k.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function a1({routeContext:i,match:e,children:t}){let r=k.useContext(Bo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),k.createElement(Zi.Provider,{value:i},t)}function o1(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let x=a.findIndex(p=>p.route.id&&(l==null?void 0:l[p.route.id])!==void 0);an(x>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,x+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let x=0;x<a.length;x++){let p=a[x];if((p.route.HydrateFallback||p.route.hydrateFallbackElement)&&(d=x),p.route.id){let{loaderData:v,errors:_}=r,E=p.route.loader&&!v.hasOwnProperty(p.route.id)&&(!_||_[p.route.id]===void 0);if(p.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(x,p)=>{var v,_;h(x,{location:r.location,params:((_=(v=r.matches)==null?void 0:v[0])==null?void 0:_.params)??{},pattern:HE(r.matches),errorInfo:p})}:void 0;return a.reduceRight((x,p,v)=>{let _,E=!1,w=null,M=null;r&&(_=l&&p.route.id?l[p.route.id]:void 0,w=p.route.errorElement||r1,c&&(d<0&&v===0?(X_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,M=null):d===v&&(E=!0,M=p.route.hydrateFallbackElement||null)));let S=e.concat(a.slice(0,v+1)),A=()=>{let L;return _?L=w:E?L=M:p.route.Component?L=k.createElement(p.route.Component,null):p.route.element?L=p.route.element:L=x,k.createElement(a1,{match:p,routeContext:{outlet:x,matches:S,isDataRoute:r!=null},children:L})};return r&&(p.route.ErrorBoundary||p.route.errorElement||v===0)?k.createElement(W_,{location:r.location,revalidation:r.revalidation,component:w,error:_,children:A(),routeContext:{outlet:null,matches:S,isDataRoute:!0},onError:f}):A()},null)}function Em(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function l1(i){let e=k.useContext(Bo);return an(e,Em(i)),e}function c1(i){let e=k.useContext(gd);return an(e,Em(i)),e}function u1(i){let e=k.useContext(Zi);return an(e,Em(i)),e}function wm(i){let e=u1(i),t=e.matches[e.matches.length-1];return an(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function d1(){return wm("useRouteId")}function h1(){var r;let i=k.useContext(Sm),e=c1("useRouteError"),t=wm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function f1(){let{router:i}=l1("useNavigate"),e=wm("useNavigate"),t=k.useRef(!1);return G_(()=>{t.current=!0}),k.useCallback(async(a,l={})=>{Ui(t.current,V_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Ox={};function X_(i,e,t){!e&&!Ox[i]&&(Ox[i]=!0,Ui(!1,t))}k.memo(p1);function p1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return j_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function hf({to:i,replace:e,state:t,relative:r}){an(Ho(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=k.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=k.useContext(Zi),{pathname:c}=Ji(),d=Mm(),h=md(i,ym(l),c,r==="path"),f=JSON.stringify(h);return k.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function m1(i){return t1(i.context)}function Kn(i){an(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function g1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){an(!Ho(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=k.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=zo(t));let{pathname:f="/",search:x="",hash:p="",state:v=null,key:_="default",mask:E}=t,w=k.useMemo(()=>{let M=qr(f,d);return M==null?null:{location:{pathname:M,search:x,hash:p,state:v,key:_,mask:E},navigationType:r}},[d,f,x,p,v,_,r,E]);return Ui(w!=null,`<Router basename="${d}"> is not able to match the URL "${f}${x}${p}" because it does not start with the basename, so the <Router> won't render anything.`),w==null?null:k.createElement(Ei.Provider,{value:h},k.createElement(tc.Provider,{children:e,value:w}))}function x1({children:i,location:e}){return n1(gp(i),e)}function gp(i,e=[]){let t=[];return k.Children.forEach(i,(r,a)=>{if(!k.isValidElement(r))return;let l=[...e,a];if(r.type===k.Fragment){t.push.apply(t,gp(r.props.children,l));return}an(r.type===Kn,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),an(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=gp(r.props.children,l)),t.push(c)}),t}var ju="get",Wu="application/x-www-form-urlencoded";function xd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function v1(i){return xd(i)&&i.tagName.toLowerCase()==="button"}function _1(i){return xd(i)&&i.tagName.toLowerCase()==="form"}function y1(i){return xd(i)&&i.tagName.toLowerCase()==="input"}function S1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function M1(i,e){return i.button===0&&(!e||e==="_self")&&!S1(i)}function xp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function E1(i,e){let t=xp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var fu=null;function w1(){if(fu===null)try{new FormData(document.createElement("form"),0),fu=!1}catch{fu=!0}return fu}var b1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function ff(i){return i!=null&&!b1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${Wu}"`),null):i}function T1(i,e){let t,r,a,l,c;if(_1(i)){let d=i.getAttribute("action");r=d?qr(d,e):null,t=i.getAttribute("method")||ju,a=ff(i.getAttribute("enctype"))||Wu,l=new FormData(i)}else if(v1(i)||y1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?qr(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||ju,a=ff(i.getAttribute("formenctype"))||ff(d.getAttribute("enctype"))||Wu,l=new FormData(d,i),!w1()){let{name:f,type:x,value:p}=i;if(x==="image"){let v=f?`${f}.`:"";l.append(`${v}x`,"0"),l.append(`${v}y`,"0")}else f&&l.append(f,p)}}else{if(xd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=ju,r=null,a=Wu,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function bm(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function $_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&qr(a.pathname,e)==="/"?a.pathname=`${id(e)}/_root.${r}`:a.pathname=`${id(a.pathname)}.${r}`,a}async function C1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function R1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function A1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await C1(l,t);return c.links?c.links():[]}return[]}));return D1(r.flat(1).filter(R1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function zx(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var x;return t[f].pathname!==h.pathname||((x=t[f].route.path)==null?void 0:x.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var p;let x=r.routes[h.route.id];if(!x||!x.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let v=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((p=t[0])==null?void 0:p.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof v=="boolean")return v}return!0}):[]}function P1(i,e,{includeHydrateFallback:t}={}){return N1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function N1(i){return[...new Set(i)]}function L1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function D1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(L1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function Tm(){let i=k.useContext(Bo);return bm(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function I1(){let i=k.useContext(gd);return bm(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var Cm=k.createContext(void 0);Cm.displayName="FrameworkContext";function vd(){let i=k.useContext(Cm);return bm(i,"You must render this element inside a <HydratedRouter> element"),i}function U1(i,e){let t=k.useContext(Cm),[r,a]=k.useState(!1),[l,c]=k.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:x,onTouchStart:p}=e,v=k.useRef(null);k.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let w=S=>{S.forEach(A=>{c(A.isIntersecting)})},M=new IntersectionObserver(w,{threshold:.5});return v.current&&M.observe(v.current),()=>{M.disconnect()}}},[i]),k.useEffect(()=>{if(r){let w=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(w)}}},[r]);let _=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,v,{}]:[l,v,{onFocus:Cl(d,_),onBlur:Cl(h,E),onMouseEnter:Cl(f,_),onMouseLeave:Cl(x,E),onTouchStart:Cl(p,_)}]:[!1,v,{}]}function Cl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function F1({page:i,...e}){let t=WE(),{nonce:r}=vd(),{router:a}=Tm(),l=k.useMemo(()=>P_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?k.createElement(O1,{page:i,matches:l,...e}):k.createElement(z1,{page:i,matches:l,...e})):null}function k1(i){let{manifest:e,routeModules:t}=vd(),[r,a]=k.useState([]);return k.useEffect(()=>{let l=!1;return A1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function O1({page:i,matches:e,...t}){let r=Ji(),{future:a}=vd(),{basename:l}=Tm(),c=k.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=$_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let x of e)typeof x.route.shouldRevalidate=="function"?h=!0:f.push(x.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return k.createElement(k.Fragment,null,c.map(d=>k.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function z1({page:i,matches:e,...t}){let r=Ji(),{future:a,manifest:l,routeModules:c}=vd(),{basename:d}=Tm(),{loaderData:h,matches:f}=I1(),x=k.useMemo(()=>zx(i,e,f,l,r,"data"),[i,e,f,l,r]),p=k.useMemo(()=>zx(i,e,f,l,r,"assets"),[i,e,f,l,r]),v=k.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let w=new Set,M=!1;if(e.forEach(A=>{var C;let L=l.routes[A.route.id];!L||!L.hasLoader||(!x.some(I=>I.route.id===A.route.id)&&A.route.id in h&&((C=c[A.route.id])!=null&&C.shouldRevalidate)||L.hasClientLoader?M=!0:w.add(A.route.id))}),w.size===0)return[];let S=$_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return M&&w.size>0&&S.searchParams.set("_routes",e.filter(A=>w.has(A.route.id)).map(A=>A.route.id).join(",")),[S.pathname+S.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,x,e,i,c]),_=k.useMemo(()=>P1(p,l),[p,l]),E=k1(p);return k.createElement(k.Fragment,null,v.map(w=>k.createElement("link",{key:w,rel:"prefetch",as:"fetch",href:w,...t})),_.map(w=>k.createElement("link",{key:w,rel:"modulepreload",href:w,...t})),E.map(({key:w,link:M})=>k.createElement("link",{key:w,nonce:t.nonce,...M,crossOrigin:M.crossOrigin??t.crossOrigin})))}function B1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var H1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{H1&&(window.__reactRouterVersion="7.18.0")}catch{}function V1({basename:i,children:e,useTransitions:t,window:r}){let a=k.useRef();a.current==null&&(a.current=xE({window:r,v5Compat:!0}));let l=a.current,[c,d]=k.useState({action:l.action,location:l.location}),h=k.useCallback(f=>{t===!1?d(f):k.startTransition(()=>d(f))},[t]);return k.useLayoutEffect(()=>l.listen(h),[l,h]),k.createElement(g1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var q_=k.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:x,preventScrollReset:p,viewTransition:v,defaultShouldRevalidate:_,...E},w){let{basename:M,navigator:S,useTransitions:A}=k.useContext(Ei),L=typeof x=="string"&&_m.test(x),C=k_(x,M);x=C.to;let I=ZE(x,{relative:a}),N=Ji(),U=null;if(d){let q=md(d,[],N.mask?N.mask.pathname:"/",!0);M!=="/"&&(q.pathname=q.pathname==="/"?M:Yi([M,q.pathname])),U=S.createHref(q)}let[b,D,O]=U1(r,E),V=W1(x,{replace:c,mask:d,state:h,target:f,preventScrollReset:p,relative:a,viewTransition:v,defaultShouldRevalidate:_,useTransitions:A});function W(q){e&&e(q),q.defaultPrevented||V(q)}let j=!(C.isExternal||l),ue=k.createElement("a",{...E,...O,href:(j?U:void 0)||C.absoluteURL||I,onClick:j?W:e,ref:B1(w,D),target:f,"data-discover":!L&&t==="render"?"true":void 0});return b&&!L?k.createElement(k.Fragment,null,ue,k.createElement(F1,{page:I})):ue});q_.displayName="Link";var go=k.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},x){let p=nc(c,{relative:f.relative}),v=Ji(),_=k.useContext(gd),{navigator:E,basename:w}=k.useContext(Ei),M=_!=null&&Q1(p)&&d===!0,S=E.encodeLocation?E.encodeLocation(p).pathname:p.pathname,A=v.pathname,L=_&&_.navigation&&_.navigation.location?_.navigation.location.pathname:null;t||(A=A.toLowerCase(),L=L?L.toLowerCase():null,S=S.toLowerCase()),L&&w&&(L=qr(L,w)||L);const C=S!=="/"&&S.endsWith("/")?S.length-1:S.length;let I=A===S||!a&&A.startsWith(S)&&A.charAt(C)==="/",N=L!=null&&(L===S||!a&&L.startsWith(S)&&L.charAt(S.length)==="/"),U={isActive:I,isPending:N,isTransitioning:M},b=I?e:void 0,D;typeof r=="function"?D=r(U):D=[r,I?"active":null,N?"pending":null,M?"transitioning":null].filter(Boolean).join(" ");let O=typeof l=="function"?l(U):l;return k.createElement(q_,{...f,"aria-current":b,className:D,ref:x,style:O,to:c,viewTransition:d},typeof h=="function"?h(U):h)});go.displayName="NavLink";var G1=k.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=ju,action:d,onSubmit:h,relative:f,preventScrollReset:x,viewTransition:p,defaultShouldRevalidate:v,..._},E)=>{let{useTransitions:w}=k.useContext(Ei),M=K1(),S=Y1(d,{relative:f}),A=c.toLowerCase()==="get"?"get":"post",L=typeof d=="string"&&_m.test(d),C=I=>{if(h&&h(I),I.defaultPrevented)return;I.preventDefault();let N=I.nativeEvent.submitter,U=(N==null?void 0:N.getAttribute("formmethod"))||c,b=()=>M(N||I.currentTarget,{fetcherKey:e,method:U,navigate:t,replace:a,state:l,relative:f,preventScrollReset:x,viewTransition:p,defaultShouldRevalidate:v});w&&t!==!1?k.startTransition(()=>b()):b()};return k.createElement("form",{ref:E,method:A,action:S,onSubmit:r?h:C,..._,"data-discover":!L&&i==="render"?"true":void 0})});G1.displayName="Form";function j1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function K_(i){let e=k.useContext(Bo);return an(e,j1(i)),e}function W1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let x=Mm(),p=Ji(),v=nc(i,{relative:c});return k.useCallback(_=>{if(M1(_,e)){_.preventDefault();let E=t!==void 0?t:jl(p)===jl(v),w=()=>x(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?k.startTransition(()=>w()):w()}},[p,x,v,t,r,a,e,i,l,c,d,h,f])}function X1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=k.useRef(xp(i)),t=k.useRef(!1),r=Ji(),a=k.useMemo(()=>E1(r.search,t.current?null:e.current),[r.search]),l=Mm(),c=k.useCallback((d,h)=>{const f=xp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var $1=0,q1=()=>`__${String(++$1)}__`;function K1(){let{router:i}=K_("useSubmit"),{basename:e}=k.useContext(Ei),t=d1(),r=i.fetch,a=i.navigate;return k.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:x,body:p}=T1(l,e);if(c.navigate===!1){let v=c.fetcherKey||q1();await r(v,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:x,body:p,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:x,body:p,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function Y1(i,{relative:e}={}){let{basename:t}=k.useContext(Ei),r=k.useContext(Zi);an(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...nc(i||".",{relative:e})},c=Ji();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(x=>x==="")){d.delete("index"),h.filter(p=>p).forEach(p=>d.append("index",p));let x=d.toString();l.search=x?`?${x}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Yi([t,l.pathname])),jl(l)}function Q1(i,{relative:e}={}){let t=k.useContext(B_);an(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=K_("useViewTransitionState"),a=nc(i,{relative:e});if(!t.isTransitioning)return!1;let l=qr(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=qr(t.nextLocation.pathname,r)||t.nextLocation.pathname;return nd(a.pathname,c)!=null||nd(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),Y_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var J1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=k.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>k.createElement("svg",{ref:h,...J1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:Y_("lucide",a),...d},[...c.map(([f,x])=>k.createElement(f,x)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gt=(i,e)=>{const t=k.forwardRef(({className:r,...a},l)=>k.createElement(ew,{ref:l,iconNode:e,className:Y_(`lucide-${Z1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=gt("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=gt("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=gt("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=gt("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=gt("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=gt("Brush",[["path",{d:"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08",key:"1styjt"}],["path",{d:"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z",key:"z0l1mu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const wa=gt("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=gt("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=gt("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=gt("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=gt("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _d=gt("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vp=gt("CircleSlash",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"9",x2:"15",y1:"15",y2:"9",key:"1dfufj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=gt("Crop",[["path",{d:"M6 2v14a2 2 0 0 0 2 2h14",key:"ron5a4"}],["path",{d:"M18 22V8a2 2 0 0 0-2-2H2",key:"7s9ehn"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=gt("Crosshair",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12",key:"l9bcsi"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12",key:"13hhkx"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2",key:"10w3f3"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18",key:"15g9kq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=gt("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fw=gt("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=gt("Eraser",[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",key:"182aya"}],["path",{d:"M22 21H7",key:"t4ddhn"}],["path",{d:"m5 11 9 9",key:"1mo9qw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pw=gt("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Hx=gt("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mw=gt("Hand",[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gw=gt("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xw=gt("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ca=gt("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vw=gt("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yd=gt("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vx=gt("Plug",[["path",{d:"M12 22v-5",key:"1ega77"}],["path",{d:"M9 8V2",key:"14iosj"}],["path",{d:"M15 8V2",key:"18g5xt"}],["path",{d:"M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z",key:"osxo6l"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _w=gt("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const yw=gt("RotateCcw",[["path",{d:"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",key:"1357e3"}],["path",{d:"M3 3v5h5",key:"1xhq8a"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Sw=gt("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z_=gt("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J_=gt("ScanEye",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["path",{d:"M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0",key:"11ak4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ey=gt("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ty=gt("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Mw=gt("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ny=gt("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Vo=gt("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rm=gt("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iy=gt("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ry=gt("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _p=gt("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ew=gt("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function $t(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const Pt=(i,e)=>$t(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),Wl=i=>$t(i,{method:"DELETE"}),rd=["empty","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK","occluded"],ww={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function dr({label:i,className:e=""}){if(i==="empty")return m.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return m.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=ww[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return m.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function Ft({title:i,right:e,children:t,className:r=""}){return m.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&m.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&m.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function mt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=k.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(x){if(!r)return;const p=r(x);if(p&&typeof p.then=="function"){d(!0);try{await p}finally{d(!1)}}}return m.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[m.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&m.jsx(Ca,{className:"absolute h-4 w-4 animate-spin"})]})}function fr({label:i,children:e,...t}){return m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,m.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}function bw(){const[i,e]=k.useState("default"),[t,r]=k.useState(800),[a,l]=k.useState(0),[c,d]=k.useState(.06),[h,f]=k.useState(!1),[x,p]=k.useState({markers_found:!1}),[v,_]=k.useState(""),[E,w]=k.useState(""),M=k.useRef(null);k.useEffect(()=>()=>{A()},[]);function S(){f(!0),clearInterval(M.current),M.current=setInterval(()=>$t("/api/camera/status").then(p).catch(()=>{}),1e3)}async function A(){f(!1),clearInterval(M.current);try{await Pt("/api/camera/release")}catch{}}function L(U){d(U),Pt("/api/calibrate/margin",{margin:U}).catch(()=>{})}async function C(){try{const U=await Pt("/api/calibrate/save",{profile:i,board_size:t,margin:c,camera:a});w(`Gespeichert: Profil „${U.profile}" (margin ${U.margin.toFixed(3)}) ✓`)}catch(U){w("Fehler: "+U.message)}}async function I(){const U=await Pt("/api/calibrate/markers");_(U.url+"?t="+Date.now())}const N="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";return m.jsxs("div",{className:"space-y-4",children:[m.jsx(Ft,{children:m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",m.jsx("input",{value:i,onChange:U=>e(U.target.value),className:`${N} w-28`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",m.jsx("input",{type:"number",value:a,onChange:U=>l(+U.target.value),className:`${N} w-16`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Board px",m.jsx("input",{type:"number",value:t,onChange:U=>r(+U.target.value),className:`${N} w-24`})]}),h?m.jsxs(mt,{onClick:A,children:[m.jsx(vp,{className:"h-4 w-4"})," Stop"]}):m.jsxs(mt,{variant:"primary",onClick:S,children:[m.jsx(wa,{className:"h-4 w-4"})," Kamera starten"]}),m.jsxs(mt,{onClick:I,children:[m.jsx(_w,{className:"h-4 w-4"})," Marker erzeugen"]})]})}),m.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_300px]",children:[m.jsx(Ft,{title:"Live-Kamera",children:h?m.jsx("img",{src:`/api/camera/calibrate.mjpg?camera=${a}&board_size=${t}`,alt:"Kalibrierung Live-Bild",className:"w-full rounded-lg border border-zinc-800"}):m.jsx("div",{className:"flex h-72 items-center justify-center text-zinc-500",children:"Kamera nicht gestartet"})}),m.jsx(Ft,{title:"Spielfeld-Box justieren",children:m.jsxs("div",{className:"space-y-3",children:[x.markers_found?m.jsxs("span",{className:"flex items-center gap-1.5 text-green-500",children:[m.jsx(_d,{className:"h-4 w-4"})," ",x.markers_count,"/4 Marker erkannt",x.markers_held?` (${x.markers_held} gehalten)`:""]}):m.jsxs("span",{className:"flex items-center gap-1.5 text-amber-400",children:[m.jsx(vp,{className:"h-4 w-4"})," ",x.markers_count||0,"/4 Marker — alle 4 nötig (kurz die Hand wegnehmen)"]}),m.jsx("input",{type:"range",min:0,max:.2,step:.005,value:c,disabled:!h,onChange:U=>L(+U.target.value),className:"w-full accent-sky-500"}),m.jsxs("div",{className:"text-sm text-zinc-400",children:["margin = ",m.jsx("b",{className:"text-zinc-100 tabular-nums",children:c.toFixed(3)})]}),m.jsx("p",{className:"text-xs text-zinc-500",children:"🟧 Marker-Box außen · 🟩 grüne Box = Spielfeld. Schieber so einstellen, dass die grüne Box auf dem echten Karofeld liegt."}),m.jsxs(mt,{variant:"primary",onClick:C,disabled:!h||!x.markers_found,children:[m.jsx(Z_,{className:"h-4 w-4"})," Kalibrierung speichern"]}),m.jsx("div",{className:"text-xs text-zinc-500",children:E})]})})]}),v&&m.jsx(Ft,{title:"Marker-Blatt — drucken, an den Boxen schneiden, an die 4 Außenecken kleben",children:m.jsx("img",{src:v,alt:"Marker-Blatt",className:"max-w-md rounded-lg border border-zinc-800 bg-white p-2"})})]})}const pf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function Tw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:x,setTogether:p,offset:v,setOffset:_,autoOffset:E,setAutoOffset:w,maxPlies:M,setMaxPlies:S,input:A}){return i?m.jsxs(m.Fragment,{children:[m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen kommen Damen/Könige doppelt so schnell zusammen.",children:["Sätze",m.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${A} w-16`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl dichter Aufbauten, die gegen deine schwächsten Klassen erzeugt werden.",children:["Aufbauten",m.jsx("input",{type:"number",min:1,value:a,onChange:L=>l(+L.target.value),className:`${A} w-20`})]})]}):e?m.jsxs(m.Fragment,{children:[m.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Welche Figuren übers Brett wandern: special = Nicht-Bauern (K,Q,R,B,N), pawn = nur Bauern, all = alle.",children:["Figuren",m.jsxs(fr,{label:"",value:h,onChange:L=>f(L.target.value),children:[m.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),m.jsx("option",{value:"pawn",children:"pawn (Bauern)"}),m.jsx("option",{value:"all",children:"all"})]})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Wiederholungen (je Pass 8 Fotos, Rang 1–8) — z.B. mit anderem Licht. Keine Figuren-Umstellung.",children:["Pässe",m.jsx("input",{type:"number",min:1,value:c,onChange:L=>d(+L.target.value),className:`${A} w-16`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen sind doppelt so viele Figuren je Foto möglich.",children:["Sätze",m.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${A} w-16`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Weiß und Schwarz gleichzeitig aufs Brett (Weiß vorne, Schwarz 4 Ränge versetzt) → halbe Fotozahl, jedes Feld bekommt beide Farben.",children:[m.jsx("input",{type:"checkbox",checked:x,onChange:L=>p(L.target.checked)})," beide Farben gleichzeitig"]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Offset automatisch: zählt bisherige Sweep-Sessions und nimmt den nächsten Offset → jede Figur landet über mehrere Sessions auf verschiedenen Linien (gegen Positions-Overfitting).",children:[m.jsx("input",{type:"checkbox",checked:E,onChange:L=>w(L.target.checked)})," Offset auto"]}),!E&&m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Verschiebt die Linien→Figur-Zuordnung, fix für diese Session. 0: a=König,b=Dame,…  1: a=Dame,b=Turm,…",children:["Offset",m.jsx("input",{type:"number",min:0,max:7,value:v,onChange:L=>_(+L.target.value),className:`${A} w-16`})]})]}):m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Halbzüge",m.jsx("input",{type:"number",value:M,onChange:L=>S(+L.target.value),className:`${A} w-20`})]})}function Cw(){const[i,e]=k.useState("random"),[t,r]=k.useState(40),[a,l]=k.useState(1),[c,d]=k.useState(20),[h,f]=k.useState(1),[x,p]=k.useState("special"),[v,_]=k.useState(!0),[E,w]=k.useState(0),[M,S]=k.useState(!0),[A,L]=k.useState("default"),[C,I]=k.useState(0),N=i==="coverage",U=i==="sweep",[b,D]=k.useState({active:!1}),[O,V]=k.useState(""),W=k.useRef(null);k.useEffect(()=>($t("/api/collect/state").then(D).catch(()=>{}),()=>clearInterval(W.current)),[]);const j=()=>$t("/api/collect/state").then(D).catch(()=>{});async function ue(){V("");try{const re=await Pt("/api/collect/start",{strategy:i,max_plies:t,profile:A,camera:C,sets:a,count:c,passes:h,pieces:x,together:v,offset:E,auto_offset:M});D(re),clearInterval(W.current),W.current=setInterval(j,1500)}catch(re){V("Fehler: "+re.message)}}const q=async()=>D(await Pt("/api/collect/shoot")),pe=async()=>D(await Pt("/api/collect/skip")),J=async()=>D(await Pt("/api/collect/undo"));async function K(){const re=await Pt("/api/collect/finish");clearInterval(W.current),D({active:!1}),V(`Session beendet: ${re.captures} Aufnahmen, ${re.sliced??0} Crops gesliced → Tab „Datensätze".`)}return m.jsxs("div",{className:"space-y-4",children:[m.jsx(Ft,{children:m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsxs(fr,{label:"Engine",value:i,onChange:re=>e(re.target.value),children:[m.jsx("option",{value:"random",children:"random (eingebaut)"}),m.jsx("option",{value:"stockfish",children:"stockfish (automatisch erkannt)"}),m.jsx("option",{value:"coverage",children:"coverage (gegen seltene Klassen)"}),m.jsx("option",{value:"sweep",children:"sweep (Figuren laufen übers Brett)"})]}),m.jsx(Tw,{coverage:N,sweep:U,input:pf,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:x,setPieces:p,together:v,setTogether:_,offset:E,setOffset:w,autoOffset:M,setAutoOffset:S,maxPlies:t,setMaxPlies:r}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",m.jsx("input",{value:A,onChange:re=>L(re.target.value),className:`${pf} w-28`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",m.jsx("input",{type:"number",value:C,onChange:re=>I(+re.target.value),className:`${pf} w-16`})]}),b.active?m.jsxs(mt,{onClick:K,children:[m.jsx(_d,{className:"h-4 w-4"})," Fertig"]}):m.jsxs(mt,{variant:"primary",onClick:ue,children:[m.jsx(yd,{className:"h-4 w-4"})," Partie starten"]}),m.jsx("span",{className:"text-xs text-zinc-500",children:O})]})}),b.active&&m.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[m.jsx(Ft,{title:"Live-Kamera",children:m.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Aufnahme Live-Bild",className:"w-full rounded-lg border border-zinc-800"})}),m.jsx(Ft,{title:"Aufnahme",children:m.jsxs("div",{className:"space-y-3",children:[b.done?m.jsxs("div",{className:"font-medium text-green-500",children:["✓ Alle ",b.n_positions," Stellungen aufgenommen."]}):m.jsxs(m.Fragment,{children:[m.jsx(Rw,{st:b}),m.jsxs("div",{className:"flex flex-wrap gap-2",children:[!b.done&&m.jsxs(mt,{variant:"primary",onClick:q,className:"px-5 py-2.5 text-base",children:[m.jsx(wa,{className:"h-5 w-5"})," Foto"]}),!b.done&&m.jsxs(mt,{onClick:pe,children:[m.jsx(iw,{className:"h-4 w-4"})," Überspringen"]}),m.jsxs(mt,{onClick:J,children:[m.jsx(iy,{className:"h-4 w-4"})," Undo"]})]})]}),m.jsxs("div",{className:"text-sm",children:["Aufnahmen: ",m.jsx("b",{className:"text-sky-400",children:b.captures}),m.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),m.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Aufnahme ist ",m.jsx("b",{children:"sofort gespeichert"}),' — du kannst jederzeit „Fertig" (oben) drücken oder einfach aufhören; nichts geht verloren.']})]})})]}),m.jsxs("p",{className:"text-xs text-zinc-500",children:['Nach „Fertig" wird die Session automatisch gesliced. Kuratierte Datensätze (Dedup, Rotation, Split) baust du im Tab ',m.jsx("b",{className:"text-zinc-300",children:"Datensätze"}),"."]})]})}function Rw({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Aufbau":"Stellung",r=i.build_target&&i.gains?m.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," Ziel-Felder"]}):null;let a;i.build_target?a=m.jsxs(m.Fragment,{children:["Stellung ",m.jsx("b",{children:"frisch aufbauen"})," — die ",m.jsx("b",{className:"text-sky-300",children:"Figurennamen"})," sind ins Live-Bild eingeblendet (weiß = helle Schrift, schwarz = dunkle),"]}):i.index===0?a=m.jsxs(m.Fragment,{children:["Brett in die ",m.jsx("b",{children:"Startstellung"})," bringen,"]}):a=m.jsxs(m.Fragment,{children:["Diesen Zug ziehen: ",m.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",m.jsx("span",{className:"text-zinc-400",children:"(roter Pfeil)"}),","]});const l=i.build_target?m.jsx(m.Fragment,{children:"(gern mehrere mit wechselndem Licht)"}):null;return m.jsxs(m.Fragment,{children:[m.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",m.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),m.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,m.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…dann ",m.jsx("b",{children:"Foto"}),l,"."]})]})]})}const Aw="abcdefgh".split(""),Pw=[8,7,6,5,4,3,2,1],Gx="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",sy={empty:"empty leer frei",occluded:"occluded verdeckt hand objekt verdeckung",wP:"white pawn weiss weißer bauer",wN:"white knight weiss weißer springer pferd",wB:"white bishop weiss weißer läufer",wR:"white rook weiss weißer turm",wQ:"white queen weiss weiße dame",wK:"white king weiss weißer könig",bP:"black pawn schwarz schwarzer bauer",bN:"black knight schwarz schwarzer springer pferd",bB:"black bishop schwarz schwarzer läufer",bR:"black rook schwarz schwarzer turm",bQ:"black queen schwarz schwarze dame",bK:"black king schwarz schwarzer könig"},Nw=(i,e)=>!e||i.toLowerCase().includes(e)||(sy[i]||"").includes(e);function Lw(){const[i,e]=k.useState("default"),[t,r]=k.useState(0),[a,l]=k.useState({active:!1}),[c,d]=k.useState({}),[h,f]=k.useState("wP"),[x,p]=k.useState(null),[v,_]=k.useState(""),[E,w]=k.useState(""),M=k.useRef(null);k.useEffect(()=>{$t("/api/manual/state").then(l).catch(()=>{})},[]);const S=Object.keys(c).length,A=rd.filter(O=>Nw(O,v.trim().toLowerCase()));function L(O,V){return h?h===V?"empty":h:V??"empty"}function C(O,V){d(W=>{const j={...W};return V==="empty"?delete j[O]:j[O]=V,j}),p(null),_("")}function I(O,V){if(h){C(O,L(O,c[O]));return}const W=V.currentTarget.getBoundingClientRect();_(""),p({square:O,x:W.left,y:W.bottom+4})}async function N(){w("");try{l(await Pt("/api/manual/start",{profile:i,camera:t}))}catch(O){w("Fehler: "+O.message)}}async function U(){S===0&&!window.confirm("Keine Figur markiert — als komplett leeres Brett aufnehmen?")||l(await Pt("/api/manual/capture",{labels:c}))}const b=async()=>l(await Pt("/api/manual/undo"));async function D(){const O=await Pt("/api/manual/finish");l({active:!1}),d({}),w(`Session beendet: ${O.captures} Aufnahmen, ${O.sliced??0} Crops → Tab „Datensätze" / „Review".`)}return m.jsxs("div",{className:"space-y-4",children:[m.jsxs(Ft,{children:[m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",m.jsx("input",{value:i,onChange:O=>e(O.target.value),className:`${Gx} w-28`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",m.jsx("input",{type:"number",value:t,onChange:O=>r(+O.target.value),className:`${Gx} w-16`})]}),a.active?m.jsxs(mt,{onClick:D,children:[m.jsx(_d,{className:"h-4 w-4"})," Fertig"]}):m.jsxs(mt,{variant:"primary",onClick:N,children:[m.jsx(yd,{className:"h-4 w-4"})," Sitzung starten"]}),m.jsx("span",{className:"text-xs text-zinc-500",children:E})]}),m.jsxs("div",{className:"mt-3 flex flex-wrap items-center gap-1",children:[m.jsxs("span",{className:"mr-1 inline-flex items-center gap-1 text-xs text-zinc-500",children:[m.jsx(Q_,{className:"h-3.5 w-3.5"})," Pinsel:"]}),m.jsx("button",{onClick:()=>f(null),className:`rounded px-2 py-1 text-xs ${h===null?"bg-sky-600 text-white":"bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`,children:"aus (Suchfeld)"}),rd.map(O=>m.jsx("button",{onClick:()=>f(V=>V===O?null:O),title:O,className:`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${h===O?"bg-sky-600 ring-2 ring-sky-300":"bg-zinc-800 hover:bg-zinc-700"}`,children:O==="empty"?m.jsx(Bx,{className:"h-4 w-4 text-zinc-400"}):m.jsx(dr,{label:O})},O))]}),m.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[a.active?h?`Pinsel „${h}" aktiv — Feld anklicken setzt (nochmal = leeren).`:"Feld anklicken → Suchfeld. ":"Starten, dann Figuren aufs reale Brett stellen und die belegten Felder markieren."," ","Nicht markierte Felder zählen als ",m.jsx("b",{children:"leer"}),'. Labels bleiben nach „Aufnehmen" erhalten → mehrere Frames mit wechselndem Licht.']})]}),a.active&&m.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_300px]",children:[m.jsx(Ft,{title:"Live-Brett — Felder anklicken zum Labeln",children:m.jsxs("div",{ref:M,className:"relative mx-auto w-full max-w-[680px]",children:[m.jsx("img",{src:"/api/camera/manual.mjpg",alt:"Live-Brett manuelles Labeln",className:"block w-full rounded-lg border border-zinc-800"}),m.jsx("div",{className:"absolute inset-0 grid grid-cols-8",children:Pw.map(O=>Aw.map(V=>{const W=V+O,j=c[W];return m.jsxs("button",{onClick:ue=>I(W,ue),className:`group relative flex items-center justify-center border border-transparent hover:border-sky-400/70 ${(x==null?void 0:x.square)===W?"border-sky-300":""}`,children:[j&&m.jsx("span",{className:"text-2xl drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]",children:m.jsx(dr,{label:j})}),m.jsx("span",{className:"pointer-events-none absolute left-0.5 top-0.5 hidden rounded bg-black/55 px-1 text-[9px] text-zinc-300 group-hover:block",children:W})]},W)}))})]})}),m.jsx(Ft,{title:"Aufnahme",children:m.jsxs("div",{className:"space-y-3",children:[m.jsxs("div",{className:"text-sm text-zinc-400",children:["Markiert: ",m.jsx("b",{className:"text-sky-400",children:S})," Figur(en)"]}),m.jsxs("div",{className:"text-sm",children:["Aufnahmen: ",m.jsx("b",{className:"text-sky-400",children:a.captures??0}),m.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),m.jsxs("div",{className:"flex flex-wrap gap-2",children:[m.jsxs(mt,{variant:"primary",onClick:U,className:"px-5 py-2.5 text-base",children:[m.jsx(wa,{className:"h-5 w-5"})," Aufnehmen"]}),m.jsxs(mt,{onClick:()=>d({}),children:[m.jsx(Bx,{className:"h-4 w-4"})," Alles leeren"]}),m.jsxs(mt,{onClick:b,children:[m.jsx(iy,{className:"h-4 w-4"})," Undo"]})]}),m.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Aufnahme ist ",m.jsx("b",{children:"sofort gespeichert"}),' und wird nach „Fertig" automatisch gesliced. Feinkorrektur (z. B. ',m.jsx("b",{children:"occluded"}),") im Tab ",m.jsx("b",{children:"Review"}),"."]})]})})]}),x&&m.jsxs(m.Fragment,{children:[m.jsx("div",{className:"fixed inset-0 z-40",role:"presentation",onClick:()=>{p(null),_("")}}),m.jsxs("div",{className:"fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl",style:{left:Math.min(x.x,window.innerWidth-240),top:Math.min(x.y,window.innerHeight-320)},children:[m.jsxs("div",{className:"mb-1 text-xs text-zinc-400",children:["Feld ",m.jsx("b",{className:"text-zinc-200",children:x.square})]}),m.jsxs("div",{className:"mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2",children:[m.jsx(ty,{className:"h-3.5 w-3.5 text-zinc-500"}),m.jsx("input",{value:v,onChange:O=>_(O.target.value),onKeyDown:O=>{O.key==="Enter"&&A[0]&&C(x.square,A[0]),O.key==="Escape"&&(p(null),_(""))},placeholder:"suchen: könig, bN, leer…",className:"w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none"})]}),m.jsx("div",{className:"max-h-56 overflow-auto",children:A.length===0?m.jsx("div",{className:"px-2 py-1.5 text-xs text-zinc-500",children:"nichts gefunden"}):A.map(O=>m.jsxs("button",{onClick:()=>C(x.square,O),className:`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${c[x.square]===O||O==="empty"&&!c[x.square]?"bg-zinc-800 text-sky-300":"text-zinc-200"}`,children:[m.jsx("span",{className:"w-5 text-center text-lg",children:O==="empty"?"·":m.jsx(dr,{label:O})}),m.jsx("span",{className:"font-mono text-xs text-zinc-400",children:O}),m.jsx("span",{className:"ml-auto text-[11px] text-zinc-500",children:(sy[O]||"").split(" ").slice(2,4).join(" ")})]},O))})]})]})]})}const po="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",mf=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function Dw(){return m.jsxs("div",{className:"space-y-4",children:[m.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[m.jsx(go,{to:"sessions",className:mf,children:"Sessions"}),m.jsx(go,{to:"kuratiert",className:mf,children:"Kuratierte Datensätze"}),m.jsx(go,{to:"statistik",className:mf,children:"Statistik"})]}),m.jsx(m1,{})]})}const ay=()=>{const i=pd();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function Iw(){const i=ay(),[e,t]=k.useState(""),a=gr({queryKey:["sessions-manage"],queryFn:()=>$t("/api/sessions/manage")}).data??[],l=p=>{t(p),i("sessions-manage","stats","datasets")},c=p=>t("Fehler: "+p.message),d=Gr({mutationFn:p=>Pt(`/api/sessions/${p}/slice`),onSuccess:p=>l(`„${p.session}" gesliced: ${p.crops} Crops.`),onError:c}),h=Gr({mutationFn:p=>Pt(`/api/sessions/${p}/archive`),onSuccess:()=>l("archiviert."),onError:c}),f=Gr({mutationFn:p=>Pt(`/api/sessions/${p}/restore`),onSuccess:()=>l("wiederhergestellt — neu slicen."),onError:c}),x=Gr({mutationFn:p=>Wl(`/api/sessions/${p}`),onSuccess:()=>l("gelöscht."),onError:c});return m.jsx(Ft,{title:"Sessions (Rohmaterial)",right:m.jsxs("span",{className:"text-xs text-zinc-500",children:[a.length," Session(s) · ",e]}),children:a.length===0?m.jsx("span",{className:"text-sm text-zinc-500",children:'Noch keine Sessions — im Tab „Sammeln" aufnehmen.'}):m.jsxs("table",{className:"w-full text-sm",children:[m.jsx("thead",{children:m.jsxs("tr",{className:"text-zinc-500",children:[m.jsx("th",{className:"text-left font-normal",children:"Session"}),m.jsx("th",{className:"text-left font-normal",children:"Modus"}),m.jsx("th",{className:"text-right font-normal",children:"Frames"}),m.jsx("th",{className:"text-right font-normal",children:"Crops"}),m.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),m.jsx("tbody",{children:a.map(p=>m.jsxs("tr",{className:"border-t border-zinc-800",children:[m.jsxs("td",{className:"py-1.5 text-zinc-200",children:[p.session_id,p.archived&&m.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archiviert"}),!p.archived&&p.n_crops===0&&m.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"nicht gesliced"})]}),m.jsx("td",{className:"text-zinc-400",children:p.mode??"—"}),m.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:p.n_frames}),m.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:p.archived?"—":p.n_crops}),m.jsx("td",{className:"py-1",children:m.jsxs("div",{className:"flex justify-end gap-1.5",children:[!p.archived&&m.jsxs(mt,{onClick:()=>d.mutate(p.session_id),className:"px-2 py-1 text-xs",children:[m.jsx(ey,{className:"h-3.5 w-3.5"})," ",p.n_crops?"Neu slicen":"Slicen"]}),p.archived?m.jsxs(mt,{onClick:()=>f.mutate(p.session_id),className:"px-2 py-1 text-xs",children:[m.jsx(tw,{className:"h-3.5 w-3.5"})," Wiederherstellen"]}):m.jsxs(mt,{onClick:()=>h.mutate(p.session_id),className:"px-2 py-1 text-xs",children:[m.jsx(nw,{className:"h-3.5 w-3.5"})," Archivieren"]}),m.jsxs(mt,{onClick:()=>window.confirm(`Session „${p.session_id}" endgültig löschen?`)&&x.mutate(p.session_id),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[m.jsx(Vo,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},p.session_id))})]})})}function Uw(){const i=ay(),[e,t]=k.useState(""),[r,a]=k.useState(!1),[l,c]=k.useState(""),[d,h]=k.useState({}),[f,x]=k.useState(4),[p,v]=k.useState(!0),[_,E]=k.useState(6),[w,M]=k.useState(!0),[S,A]=k.useState(.15),[L,C]=k.useState(.15),I=gr({queryKey:["sessions-manage"],queryFn:()=>$t("/api/sessions/manage")}),N=gr({queryKey:["datasets"],queryFn:()=>$t("/api/datasets")}),U=(I.data??[]).filter(j=>!j.archived),b=N.data??[],D=Gr({mutationFn:j=>Pt("/api/datasets",j),onSuccess:j=>{t(`„${j.name}" gebaut: roh ${j.counts.raw} → dedup ${j.counts.after_dedup} → final ${j.counts.final}.`),a(!1),c(""),h({}),i("datasets","stats")},onError:j=>t("Fehler: "+j.message)}),O=Gr({mutationFn:j=>Wl(`/api/datasets/${j}`),onSuccess:()=>{t("gelöscht."),i("datasets")}}),V=Gr({mutationFn:j=>Pt(`/api/datasets/${j}/rebuild`),onSuccess:j=>{var ue;t(`„${j.name}" neu gebaut: ${(ue=j.counts)==null?void 0:ue.final} Crops.`),i("datasets","stats")},onError:j=>t("Fehler: "+j.message)});function W(){const j=U.filter(ue=>d[ue.session_id]).map(ue=>ue.session_id);if(!l.trim()||j.length===0){t("Name und mind. eine Session wählen.");return}D.mutate({name:l.trim(),session_ids:j,per_cell_cap:f,phash_enabled:p,phash_hamming:_,rotate:w,val_frac:S,test_frac:L})}return m.jsxs(Ft,{title:"Kuratierte Datensätze",right:m.jsxs("div",{className:"flex items-center gap-2",children:[m.jsx("span",{className:"text-xs text-zinc-500",children:e}),m.jsxs(mt,{onClick:()=>a(j=>!j),className:"px-2 py-1 text-xs",children:[m.jsx(sw,{className:"h-3.5 w-3.5"})," Neuer Datensatz"]})]}),children:[r&&m.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",m.jsx("input",{value:l,onChange:j=>c(j.target.value),className:`${po} w-40`,placeholder:"z.B. set-a"})]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. Crops je (Session, Feld, Figur)",children:["Cap/Feld",m.jsx("input",{type:"number",min:1,value:f,onChange:j=>x(+j.target.value),className:`${po} w-16`})]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[m.jsx("input",{type:"checkbox",checked:p,onChange:j=>v(j.target.checked)})," pHash"]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",m.jsx("input",{type:"number",min:0,max:32,value:_,disabled:!p,onChange:j=>E(+j.target.value),className:`${po} w-14`})]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× Crops. ACHTUNG: widerspricht der Fixkamera-Annahme — A/B testen.",children:[m.jsx("input",{type:"checkbox",checked:w,onChange:j=>M(j.target.checked)})," ",m.jsx(Sw,{className:"h-3.5 w-3.5"})," Rotation"]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",m.jsx("input",{type:"number",step:.05,min:0,max:.5,value:S,onChange:j=>A(+j.target.value),className:`${po} w-14`})]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",m.jsx("input",{type:"number",step:.05,min:0,max:.5,value:L,onChange:j=>C(+j.target.value),className:`${po} w-14`})]})]}),m.jsxs("div",{children:[m.jsx("div",{className:"mb-1 text-xs text-zinc-500",children:"Sessions (Teilmenge frei wählbar — Datensätze dürfen sich überschneiden):"}),m.jsx("div",{className:"flex flex-wrap gap-2",children:U.length===0?m.jsx("span",{className:"text-xs text-zinc-500",children:"keine aktiven Sessions"}):U.map(j=>m.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[m.jsx("input",{type:"checkbox",checked:!!d[j.session_id],onChange:ue=>h(q=>({...q,[j.session_id]:ue.target.checked}))}),j.session_id," ",m.jsxs("span",{className:"text-zinc-500",children:["(",j.n_crops,")"]})]},j.session_id))})]}),m.jsxs(mt,{variant:"primary",onClick:W,disabled:D.isPending,children:[m.jsx(Hx,{className:"h-4 w-4"})," ",D.isPending?"Baue…":"Bauen"]})]}),b.length===0?m.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Datensatz gebaut."}):m.jsxs("table",{className:"w-full text-sm",children:[m.jsx("thead",{children:m.jsxs("tr",{className:"text-zinc-500",children:[m.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),m.jsx("th",{className:"text-right font-normal",children:"Sessions"}),m.jsx("th",{className:"text-right font-normal",children:"roh→dedup→final"}),m.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),m.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),m.jsx("tbody",{children:b.map(j=>{var ue,q,pe,J,K,re,he;return m.jsxs("tr",{className:"border-t border-zinc-800",children:[m.jsxs("td",{className:"py-1.5 text-zinc-200",children:[j.name,((ue=j.rotations)==null?void 0:ue.some(z=>z))&&m.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),m.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.n_sessions}),m.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[(q=j.counts)==null?void 0:q.raw,"→",(pe=j.counts)==null?void 0:pe.after_dedup,"→",(J=j.counts)==null?void 0:J.final]}),m.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((K=j.split_counts)==null?void 0:K.train)??"?","/",((re=j.split_counts)==null?void 0:re.val)??"?","/",((he=j.split_counts)==null?void 0:he.test)??"?"]}),m.jsx("td",{className:"py-1",children:m.jsxs("div",{className:"flex justify-end gap-1.5",children:[m.jsx(go,{to:`../statistik?ds=${encodeURIComponent(j.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),m.jsxs(mt,{onClick:()=>V.mutate(j.name),className:"px-2 py-1 text-xs",children:[m.jsx(Hx,{className:"h-3.5 w-3.5"})," Neu bauen"]}),m.jsxs(mt,{onClick:()=>window.confirm(`Datensatz „${j.name}" löschen?`)&&O.mutate(j.name),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[m.jsx(Vo,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},j.name)})})]})]})}function Fw(){const[i,e]=X1(),t=i.get("ds")??"",[r,a]=k.useState(null),l=gr({queryKey:["datasets"],queryFn:()=>$t("/api/datasets")}),c=gr({queryKey:["stats",t],queryFn:()=>{const _=t?`?dataset=${encodeURIComponent(t)}`:"";return $t(`/api/stats${_}`)}}),d=l.data??[],h=c.data;if(c.isLoading||!h)return m.jsx(Ft,{children:"Stats laden…"});const f=t?`Datensatz „${t}"`:"globaler Pool",x=Math.max(1,...Object.values(h.counts??{x:1})),p=(_,E)=>_==="empty"||_==="occluded"?"#38bdf8":E<h.min_samples*.5?"#ef4444":E<h.min_samples?"#eab308":"#22c55e",v=_=>{const E=t?`&dataset=${encodeURIComponent(t)}`:"";return $t(`/api/class/${_}?limit=120${E}`).then(w=>a({label:_,crops:w.crops}))};return m.jsxs("div",{className:"space-y-4",children:[m.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[m.jsxs(Ft,{title:"Klassenverteilung",className:"lg:col-span-2",right:m.jsxs("select",{value:t,onChange:_=>e(_.target.value?{ds:_.target.value}:{}),className:po,children:[m.jsx("option",{value:"",children:"globaler Pool"}),d.map(_=>m.jsx("option",{value:_.name,children:_.name},_.name))]}),children:[m.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," Crops · ",h.num_sessions," Sessions",t?` · Datensatz „${t}"`:" · roh"]}),m.jsx("div",{className:"space-y-1.5",children:h.classes.map(_=>{const E=h.counts[_]||0;return m.jsxs("button",{onClick:()=>v(_),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[m.jsxs("span",{className:"text-zinc-300",children:[m.jsx(dr,{label:_}),m.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:_})]}),m.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:m.jsx("div",{className:"h-full rounded-full",style:{width:`${E/x*100}%`,background:p(_,E)}})}),m.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:E})]},_)})})]}),m.jsx(Ft,{title:"Hell / Dunkel",children:m.jsxs("table",{className:"w-full text-sm",children:[m.jsx("thead",{children:m.jsxs("tr",{className:"text-zinc-500",children:[m.jsx("th",{className:"text-left font-normal",children:"Klasse"}),m.jsx("th",{children:"hell"}),m.jsx("th",{children:"dunkel"})]})}),m.jsx("tbody",{children:h.classes.map(_=>{const E=w=>w>0?m.jsx(ow,{className:"mx-auto h-4 w-4 text-green-500"}):m.jsx(Ew,{className:"mx-auto h-4 w-4 text-red-500"});return m.jsxs("tr",{className:"border-t border-zinc-800",children:[m.jsxs("td",{className:"py-1 text-zinc-300",children:[m.jsx(dr,{label:_})," ",m.jsx("span",{className:"text-xs text-zinc-500",children:_})]}),m.jsx("td",{children:E(h.light[_]||0)}),m.jsx("td",{children:E(h.dark[_]||0)})]},_)})})]})})]}),m.jsx(Ft,{title:"Warnungen",children:h.warnings.length?m.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((_,E)=>m.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[m.jsx(Rm,{className:"h-4 w-4 shrink-0"})," ",_]},E))}):m.jsx("span",{className:"text-sm text-green-500",children:"keine"})}),m.jsx(Ft,{title:`Crops durchblättern (${f})`,right:m.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[m.jsx(xw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Klasse anklicken"]}),children:r?m.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((_,E)=>m.jsx("img",{src:_.url,title:`${_.session_id} ${_.frame} ${_.square}`,alt:`Feld ${_.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},E))}):m.jsx("span",{className:"text-sm text-zinc-500",children:"Wähle links eine Klasse, um die Crops zu sehen."})})]})}const kw="abcdefgh".split(""),oy={empty:"empty leer frei",occluded:"occluded verdeckt hand objekt verdeckung",wP:"white pawn weiss weißer bauer",wN:"white knight weiss weißer springer pferd",wB:"white bishop weiss weißer läufer",wR:"white rook weiss weißer turm",wQ:"white queen weiss weiße dame",wK:"white king weiss weißer könig",bP:"black pawn schwarz schwarzer bauer",bN:"black knight schwarz schwarzer springer pferd",bB:"black bishop schwarz schwarzer läufer",bR:"black rook schwarz schwarzer turm",bQ:"black queen schwarz schwarze dame",bK:"black king schwarz schwarzer könig"},Ow=(i,e)=>!e||i.toLowerCase().includes(e)||(oy[i]||"").includes(e);function zw(){var He;const i=pd(),[e,t]=k.useState(""),[r,a]=k.useState(""),[l,c]=k.useState(""),[d,h]=k.useState({}),[f,x]=k.useState(null),[p,v]=k.useState(null),[_,E]=k.useState(""),[w,M]=k.useState(""),[S,A]=k.useState(0),[L,C]=k.useState(0),I=gr({queryKey:["sessions"],queryFn:()=>$t("/api/sessions")}),N=gr({queryKey:["runs"],queryFn:()=>$t("/api/runs")}),U=I.data??[],b=N.data??[],D=((He=U.find(H=>H.session_id===e))==null?void 0:He.frames)??[],O=D.indexOf(r);k.useEffect(()=>{U.length&&(!e||!U.some(H=>H.session_id===e))&&(t(U[0].session_id),a(U[0].frames[0]??""))},[U]),k.useEffect(()=>{D.length&&!D.includes(r)&&a(D[0])},[e,D.join(",")]),k.useEffect(()=>{b.length&&!l&&c(b[b.length-1].run)},[b]);const V=gr({queryKey:["review",e,r,l],queryFn:()=>$t(`/api/review?session=${e}&frame=${r}&run=${l}`),enabled:!!e&&!!r,retry:!1});k.useEffect(()=>{h({}),v(null)},[e,r]);const W=V.data,j={};((W==null?void 0:W.cells)??[]).forEach(H=>j[H.square]=H);const ue=Object.keys(d).length,q=H=>d[H.square]??H.label;function pe(H,ve){var te;const fe=(te=j[H])==null?void 0:te.label;h(Fe=>{const Xe={...Fe};return ve===fe?delete Xe[H]:Xe[H]=ve,Xe}),v(null),E("")}function J(H,ve){if(f){pe(H,f);return}const fe=ve.currentTarget.getBoundingClientRect();E(""),v({square:H,x:fe.left,y:fe.bottom+4})}function K(){W!=null&&W.cells&&(h(H=>{const ve={...H};for(const fe of W.cells)fe.pred_label&&fe.pred_label!==fe.label&&(ve[fe.square]=fe.pred_label);return ve}),M("Modell-Vorschläge übernommen — prüfen & speichern."))}function re(H){D.length&&a(D[Math.min(D.length-1,Math.max(0,(O<0?0:O)+H))])}k.useEffect(()=>{const H=ve=>{ve.target instanceof HTMLInputElement||ve.target instanceof HTMLSelectElement||(ve.key==="ArrowLeft"&&re(-1),ve.key==="ArrowRight"&&re(1),ve.key==="Escape"&&x(null))};return window.addEventListener("keydown",H),()=>window.removeEventListener("keydown",H)},[D.join(","),O]);const he=Gr({mutationFn:()=>Pt("/api/corrections",Object.entries(d).map(([H,ve])=>({session_id:e,frame:r,square:H,label:ve}))),onSuccess:H=>{M(`${H.applied} Korrekturen gespeichert. „Slicen" übernimmt sie.`),h({})},onError:H=>M("Fehler: "+H.message)}),z=Gr({mutationFn:()=>Pt(`/api/reslice?session=${e}&pad_up=${S}&pad_side=${L}`),onSuccess:H=>{M(`Neu gesliced ✓ (${H.crops??"?"} Crops).`),i.invalidateQueries({queryKey:["review"]}),i.invalidateQueries({queryKey:["sessions"]})},onError:H=>M("Slicing fehlgeschlagen: "+H.message)}),ie="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100",Ie=p?j[p.square]:null,je=rd.filter(H=>Ow(H,_.trim().toLowerCase()));return m.jsxs("div",{className:"space-y-4",children:[m.jsxs(Ft,{children:[m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsx(fr,{label:"Session",value:e,onChange:H=>t(H.target.value),children:U.map(H=>m.jsxs("option",{value:H.session_id,children:[H.session_id," (",H.n_frames,")"]},H.session_id))}),m.jsxs("div",{className:"flex items-center gap-1",children:[m.jsx(mt,{onClick:()=>re(-1),disabled:O<=0,className:"px-2 py-1.5",children:m.jsx(lw,{className:"h-4 w-4"})}),m.jsx(fr,{label:"Frame",value:r,onChange:H=>a(H.target.value),children:D.map(H=>m.jsx("option",{children:H},H))}),m.jsx(mt,{onClick:()=>re(1),disabled:O<0||O>=D.length-1,className:"px-2 py-1.5",children:m.jsx(cw,{className:"h-4 w-4"})}),m.jsx("span",{className:"ml-1 text-xs tabular-nums text-zinc-500",children:D.length?`${O+1} / ${D.length}`:"0 / 0"})]}),m.jsxs(fr,{label:"Modell",value:l,onChange:H=>c(H.target.value),children:[m.jsx("option",{value:"",children:"(kein Modell)"}),b.map(H=>m.jsx("option",{value:H.run,children:H.run},H.run))]}),l&&m.jsxs(mt,{onClick:K,children:[m.jsx(_p,{className:"h-4 w-4"})," Vorschläge übernehmen"]}),m.jsxs(mt,{variant:"primary",onClick:()=>he.mutate(),disabled:ue===0||he.isPending,children:[m.jsx(Z_,{className:"h-4 w-4"})," Speichern (",ue,")"]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["pad_up",m.jsx("input",{type:"number",step:.05,min:0,value:S,onChange:H=>A(+H.target.value),className:`${ie} w-16`})]}),m.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["pad_side",m.jsx("input",{type:"number",step:.02,min:0,value:L,onChange:H=>C(+H.target.value),className:`${ie} w-16`})]}),m.jsxs(mt,{onClick:()=>z.mutate(),disabled:!e||z.isPending,children:[m.jsx(ey,{className:"h-4 w-4"})," Slicen"]})]}),m.jsxs("div",{className:"mt-3 flex flex-wrap items-center gap-1",children:[m.jsxs("span",{className:"mr-1 inline-flex items-center gap-1 text-xs text-zinc-500",children:[m.jsx(Q_,{className:"h-3.5 w-3.5"})," Pinsel:"]}),m.jsx("button",{onClick:()=>x(null),className:`rounded px-2 py-1 text-xs ${f===null?"bg-sky-600 text-white":"bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`,children:"aus (Suchfeld)"}),rd.map(H=>m.jsx("button",{onClick:()=>x(ve=>ve===H?null:H),title:H,className:`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${f===H?"bg-sky-600 ring-2 ring-sky-300":"bg-zinc-800 hover:bg-zinc-700"}`,children:m.jsx(dr,{label:H})},H))]}),m.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[w||(V.isError?"keine Crops für diese Session/Frame (erst slicen?)":f?`Pinsel „${f}" aktiv — Felder anklicken setzt direkt (Esc = aus).`:"Pinsel wählen zum schnellen Malen, oder Feld anklicken → Suchfeld · ◀▶/Pfeiltasten steppen."),!w&&!V.isError&&m.jsxs(m.Fragment,{children:[" ",m.jsx("span",{className:"text-red-400",children:"Rot"}),"=Modell widerspricht · ",m.jsx("span",{className:"text-amber-400",children:"Gelb"}),"=unsicher · ",m.jsx("span",{className:"text-sky-400",children:"Blau"}),"=geändert."]})]})]}),W&&m.jsxs(Ft,{title:`Brett — ${e} / ${r}`,children:[m.jsx("div",{className:"grid w-full max-w-[920px] grid-cols-8 gap-1",children:[8,7,6,5,4,3,2,1].map(H=>kw.map(ve=>{const fe=j[ve+H];if(!fe)return m.jsx("div",{},ve+H);const Fe=fe.square in d?"ring-sky-400":fe.disagree?"ring-red-500":fe.confidence!=null&&fe.confidence<.6?"ring-amber-400":"ring-zinc-700";return m.jsxs("button",{onClick:Xe=>J(fe.square,Xe),className:`relative aspect-square overflow-hidden rounded-md bg-black ring-2 ${Fe} ${(p==null?void 0:p.square)===fe.square?"ring-sky-300":""} hover:ring-sky-300`,children:[m.jsx("img",{src:fe.url,alt:`Feld ${fe.square}`,className:"h-full w-full object-cover"}),m.jsx("span",{className:"absolute left-0.5 top-0.5 rounded bg-black/55 px-1 text-[9px] text-zinc-400",children:ve+H}),fe.pred_label&&m.jsxs("span",{className:"absolute right-0 top-0 inline-flex items-center gap-0.5 rounded-bl bg-black/60 px-1 text-[10px] text-zinc-300",children:[m.jsx(dr,{label:fe.pred_label})," ",Math.round((fe.confidence||0)*100),"%"]}),m.jsx("span",{className:"absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-lg font-bold",children:m.jsx(dr,{label:q(fe)})})]},ve+H)}))}),m.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[ue," geändert · Klasse je Feld per Suchfeld setzen."]})]}),p&&Ie&&m.jsxs(m.Fragment,{children:[m.jsx("div",{className:"fixed inset-0 z-40",role:"presentation",onClick:()=>{v(null),E("")}}),m.jsxs("div",{className:"fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl",style:{left:Math.min(p.x,window.innerWidth-240),top:Math.min(p.y,window.innerHeight-320)},children:[m.jsxs("div",{className:"mb-1 flex items-center justify-between text-xs text-zinc-400",children:[m.jsxs("span",{children:["Feld ",m.jsx("b",{className:"text-zinc-200",children:p.square})]}),Ie.pred_label&&m.jsxs("button",{onClick:()=>pe(p.square,Ie.pred_label),className:"inline-flex items-center gap-1 text-sky-400 hover:underline",children:["Vorschlag ",m.jsx(dr,{label:Ie.pred_label})," ",Math.round((Ie.confidence||0)*100),"%"]})]}),m.jsxs("div",{className:"mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2",children:[m.jsx(ty,{className:"h-3.5 w-3.5 text-zinc-500"}),m.jsx("input",{value:_,onChange:H=>E(H.target.value),onKeyDown:H=>{H.key==="Enter"&&je[0]&&pe(p.square,je[0]),H.key==="Escape"&&(v(null),E(""))},placeholder:"suchen: könig, bN, leer…",className:"w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none"})]}),m.jsx("div",{className:"max-h-56 overflow-auto",children:je.length===0?m.jsx("div",{className:"px-2 py-1.5 text-xs text-zinc-500",children:"nichts gefunden"}):je.map(H=>m.jsxs("button",{onClick:()=>pe(p.square,H),className:`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${q(Ie)===H?"bg-zinc-800 text-sky-300":"text-zinc-200"}`,children:[m.jsx("span",{className:"w-5 text-center text-lg",children:m.jsx(dr,{label:H})}),m.jsx("span",{className:"font-mono text-xs text-zinc-400",children:H}),m.jsx("span",{className:"ml-auto text-[11px] text-zinc-500",children:(oy[H]||"").split(" ").slice(2,4).join(" ")})]},H))})]})]})]})}function jx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(p=>p.data.map(v=>v.x)),d=Math.max(1,...c),h=p=>30+540*p/d,f=p=>170-140*(p-e)/Math.max(1e-9,t-e),x=4;return m.jsxs("div",{children:[m.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:x+1},(p,v)=>{const _=e+(t-e)*v/x;return m.jsxs("g",{children:[m.jsx("line",{x1:30,y1:f(_),x2:570,y2:f(_),stroke:"#27272a",strokeWidth:1}),m.jsx("text",{x:4,y:f(_)+3,fill:"#71717a",fontSize:10,children:_.toFixed(t<=1?2:1)})]},v)}),i.map(p=>p.data.length?m.jsx("polyline",{fill:"none",stroke:p.color,strokeWidth:2,strokeLinejoin:"round",points:p.data.map(v=>`${h(v.x).toFixed(1)},${f(v.y).toFixed(1)}`).join(" ")},p.name):null)]}),m.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(p=>m.jsxs("span",{className:"flex items-center gap-1.5",children:[m.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:p.color}}),p.name]},p.name))})]})}const pu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function Bw(){var H,ve,fe;const[i,e]=k.useState([]),[t,r]=k.useState(""),[a,l]=k.useState(""),[c,d]=k.useState([]),[h,f]=k.useState({}),[x,p]=k.useState({running:!1}),[v,_]=k.useState(""),[E,w]=k.useState("smallcnn"),[M,S]=k.useState("combined"),[A,L]=k.useState(30),[C,I]=k.useState(256),[N,U]=k.useState(3e-4),[b,D]=k.useState(7),[O,V]=k.useState(""),W=k.useRef(null),ue=gr({queryKey:["datasets"],queryFn:()=>$t("/api/datasets")}).data??[],q=ue.find(te=>te.name===a);k.useEffect(()=>{ue.length&&!a&&l(ue[0].name)},[ue]);const pe=k.useCallback(async()=>{const te=await $t("/api/runs");e(te),te.length&&!t&&J(te[0].run)},[t]);k.useEffect(()=>(pe(),()=>clearInterval(W.current)),[pe]);async function J(te){r(te),d((await $t(`/api/runs/${te}/metrics`)).metrics),f((await $t(`/api/runs/${te}/eval`)).evals)}async function K(te){if(window.confirm(`Modell „${te}" löschen? (Verzeichnis + Gewichte werden entfernt)`)){try{await Wl(`/api/runs/${te}`)}catch(Fe){_(Fe.message);return}t===te&&(r(""),d([]),f({})),pe()}}const re=te=>te==null?"—":(te*100).toFixed(1)+" %";async function he(){if(_(""),!a){_("Kein Datensatz — erst im Tab Datensätze einen bauen.");return}try{await Pt("/api/train",{backbone:E,head:M,epochs:A,batch_size:C,lr:N,patience:b,no_amp:!0,dataset:a,resume:O||void 0}),clearInterval(W.current),W.current=setInterval(z,2500),z()}catch(te){_(te.message)}}async function z(){var Fe;const te=await $t("/api/train/status");p(te),(Fe=te.metrics)!=null&&Fe.length&&d(te.metrics),te.running||(clearInterval(W.current),pe())}async function ie(){var te;try{await Pt("/api/train/stop")}catch{}clearInterval(W.current);try{const Fe=await $t("/api/train/status");p({...Fe,running:!1}),Fe.run&&r(Fe.run),(te=Fe.metrics)!=null&&te.length&&d(Fe.metrics)}catch{p({running:!1,state:"stopped"})}pe()}const Ie=[{name:"train_loss",color:"#ef4444",data:c.map(te=>({x:te.epoch,y:te.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(te=>({x:te.epoch,y:te.val_loss??0}))}],je=Math.max(.5,...c.map(te=>Math.max(te.train_loss||0,te.val_loss||0))),He=[{name:"square_acc",color:"#38bdf8",data:c.map(te=>({x:te.epoch,y:te.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(te=>({x:te.epoch,y:te.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(te=>({x:te.epoch,y:te.val_board_acc??0}))}];return m.jsxs("div",{className:"space-y-4",children:[m.jsxs(Ft,{children:[m.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[m.jsxs(fr,{label:"Datensatz",value:a,onChange:te=>l(te.target.value),children:[ue.length===0&&m.jsx("option",{value:"",children:"— keiner gebaut —"}),ue.map(te=>{var Fe;return m.jsxs("option",{value:te.name,children:[te.name," (",((Fe=te.counts)==null?void 0:Fe.final)??"?",")"]},te.name)})]}),m.jsxs(fr,{label:"Backbone",value:E,onChange:te=>w(te.target.value),children:[m.jsx("option",{value:"smallcnn",children:"smallcnn"}),m.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"})]}),m.jsxs(fr,{label:"Kopf",value:M,onChange:te=>S(te.target.value),children:[m.jsx("option",{value:"combined",children:"combined"}),m.jsx("option",{value:"factored",children:"factored"}),m.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),m.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Epochs",m.jsx("input",{type:"number",min:1,value:A,onChange:te=>L(+te.target.value),className:pu})]}),m.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Batch",m.jsx("input",{type:"number",min:1,value:C,onChange:te=>I(+te.target.value),className:pu})]}),m.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["LR",m.jsx("input",{type:"number",step:1e-4,min:0,value:N,onChange:te=>U(+te.target.value),className:pu})]}),m.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early Stopping: Epochen ohne macro_recall-Fortschritt, bevor abgebrochen wird.",children:["Geduld",m.jsx("input",{type:"number",min:1,value:b,onChange:te=>D(+te.target.value),className:pu})]}),m.jsxs(fr,{label:"Weiter ab",value:O,onChange:te=>V(te.target.value),children:[m.jsx("option",{value:"",children:"von Grund auf"}),i.some(te=>String(te.dataset||"").startsWith("pretrain-"))&&m.jsx("optgroup",{label:"Basis-Modelle (vortrainiert)",children:i.filter(te=>String(te.dataset||"").startsWith("pretrain-")).map(te=>m.jsxs("option",{value:te.run,children:["🔹 Basis · ",te.run]},te.run))}),m.jsx("optgroup",{label:"Eigene Runs",children:i.filter(te=>!String(te.dataset||"").startsWith("pretrain-")).map(te=>m.jsx("option",{value:te.run,children:te.run},te.run))})]}),m.jsxs(mt,{variant:"primary",onClick:he,disabled:x.running||!a,children:[x.running?m.jsx(Ca,{className:"h-4 w-4 animate-spin"}):m.jsx(yd,{className:"h-4 w-4"})," Training starten"]}),x.running&&m.jsxs(mt,{onClick:ie,children:[m.jsx(ny,{className:"h-4 w-4"})," Abbrechen"]})]}),q&&m.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((H=q.split_counts)==null?void 0:H.train)??"?"," · val ",((ve=q.split_counts)==null?void 0:ve.val)??"?"," · test ",((fe=q.split_counts)==null?void 0:fe.test)??"?"]}),(x.running||c.length>0)&&m.jsxs("div",{className:"mt-3",children:[m.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[m.jsxs("span",{children:[x.running?`läuft… (${x.run})`:x.state==="stopped"||x.state==="crashed"?"abgebrochen":"Fortschritt"," · Epoche ",c.length,"/",A]}),m.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),m.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:m.jsx("div",{className:`h-full rounded-full transition-all ${x.state==="stopped"||x.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,A)*100)}%`}})})]}),!x.running&&x.state==="done"&&m.jsx("p",{className:"mt-2 text-xs text-green-500",children:"fertig ✓"}),!x.running&&(x.state==="stopped"||x.state==="crashed")&&m.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[x.state==="crashed"?"abgebrochen (Crash)":"abgebrochen"," bei Epoche ",c.length,' — Teil-Fortschritt bleibt erhalten; „best.pt" ist gespeichert, „Weiter ab" setzt hier an.']}),v&&m.jsx("p",{className:"mt-2 text-sm text-amber-400",children:v})]}),m.jsxs(Ft,{title:"Modelle",right:m.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?m.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Modell trainiert."}):m.jsx("div",{className:"overflow-x-auto",children:m.jsxs("table",{className:"w-full text-sm",children:[m.jsx("thead",{children:m.jsxs("tr",{className:"text-zinc-500",children:[m.jsx("th",{className:"text-left font-normal",children:"Run"}),m.jsx("th",{className:"text-left font-normal",children:"Backbone"}),m.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),m.jsx("th",{className:"text-right font-normal",children:"Kl."}),m.jsx("th",{className:"text-right font-normal",children:"Ep."}),m.jsx("th",{className:"text-right font-normal",title:"bestes val board_acc (alle 64 Felder korrekt)",children:"board_acc"}),m.jsx("th",{className:"text-right font-normal",title:"bestes val square_acc (Anteil korrekter Einzelfelder — treibt board_acc ≈ square_acc^64)",children:"square_acc"}),m.jsx("th",{className:"text-right font-normal",title:"bestes val macro_recall",children:"macro_rec"}),m.jsx("th",{className:"text-right font-normal",title:"Test-Set board_acc (nach eval)",children:"test"}),m.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),m.jsx("tbody",{children:i.map(te=>m.jsxs("tr",{className:`border-t border-zinc-800 ${t===te.run?"bg-zinc-800/50":""}`,children:[m.jsxs("td",{className:"py-1.5 text-zinc-200",children:[te.run,te.resumed_from&&m.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`weiter ab ${te.resumed_from}`,children:"↻"}),te.has_occluded&&m.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),m.jsx("td",{className:"text-zinc-400",children:te.backbone}),m.jsx("td",{className:"text-zinc-400",children:te.dataset??"—"}),m.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:te.n_classes}),m.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:te.epochs_done}),m.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(te.best_board_acc)}),m.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(te.best_square_acc)}),m.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(te.best_macro_recall)}),m.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(te.test_board_acc)}),m.jsx("td",{className:"py-1",children:m.jsxs("div",{className:"flex justify-end gap-1.5",children:[m.jsxs(mt,{onClick:()=>J(te.run),className:"px-2 py-1 text-xs",children:[m.jsx(pw,{className:"h-3.5 w-3.5"})," Anzeigen"]}),m.jsxs(mt,{onClick:()=>K(te.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[m.jsx(Vo,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},te.run))})]})}),m.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['„Anzeigen" lädt Kurven & Eval unten · „test" erscheint nach ',m.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = weiter-trainiert · +occ = Modell kennt die Klasse „verdeckt".']})]}),m.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[m.jsx(Ft,{title:"Loss",children:m.jsx(jx,{series:Ie,yMin:0,yMax:je})}),m.jsx(Ft,{title:"Metriken (0–1) — macro_recall ist die ehrliche Zahl",children:m.jsx(jx,{series:He,yMin:0,yMax:1})})]}),m.jsx(Ft,{title:"Evaluation",children:Object.keys(h).length?m.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([te,Fe])=>{const Xe=Object.entries(Fe.recall||{}).sort((kt,ct)=>kt[1]-ct[1]).slice(0,3);return m.jsxs("div",{children:[m.jsxs("div",{className:"text-sm",children:[m.jsx("span",{className:"font-medium uppercase text-zinc-400",children:te})," · board_acc ",m.jsxs("b",{children:[(Fe.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Fe.square_acc*100).toFixed(1),"%"]}),m.jsxs("div",{className:"text-xs text-zinc-500",children:["schwächste Klassen: ",Xe.map(([kt,ct])=>`${kt} ${(ct*100).toFixed(0)}%`).join(", ")]}),Fe.confusion_png&&m.jsx("img",{src:Fe.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},te)})}):m.jsxs("span",{className:"text-sm text-zinc-500",children:["Noch keine eval — ",m.jsx("code",{children:"chesslab eval --run …"})]})}),x.log_tail&&m.jsx(Ft,{title:"Log",children:m.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:x.log_tail})})]})}const Wx="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function Hw(){const e=gr({queryKey:["runs"],queryFn:()=>$t("/api/runs")}).data??[],[t,r]=k.useState(""),[a,l]=k.useState("default"),[c,d]=k.useState(0),[h,f]=k.useState(!1),[x,p]=k.useState({}),[v,_]=k.useState(""),E=k.useRef(null);k.useEffect(()=>{e.length&&!t&&r(e[e.length-1].run)},[e]),k.useEffect(()=>()=>{clearInterval(E.current),h&&Pt("/api/camera/release").catch(()=>{})},[]);async function w(){_("");try{await Pt("/api/inference/start",{run:t,profile:a,camera:c}),f(!0),clearInterval(E.current),E.current=setInterval(()=>$t("/api/inference/state").then(p).catch(()=>{}),1e3)}catch(A){_("Fehler: "+A.message)}}async function M(){f(!1),clearInterval(E.current);try{await Pt("/api/camera/release")}catch{}}async function S(){try{const A=await Pt("/api/inference/capture");_(`Snapshot gespeichert: ${A.crops} Crops (Session ${A.session}). ${A.hint}`)}catch(A){_("Fehler: "+A.message)}}return m.jsxs("div",{className:"space-y-4",children:[m.jsxs(Ft,{children:[m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsxs(fr,{label:"Modell",value:t,onChange:A=>r(A.target.value),children:[e.length===0&&m.jsx("option",{value:"",children:"— kein Modell trainiert —"}),e.map(A=>m.jsx("option",{value:A.run,children:A.run},A.run))]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",m.jsx("input",{value:a,onChange:A=>l(A.target.value),className:`${Wx} w-28`})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",m.jsx("input",{type:"number",value:c,onChange:A=>d(+A.target.value),className:`${Wx} w-16`})]}),h?m.jsxs(mt,{onClick:M,children:[m.jsx(vp,{className:"h-4 w-4"})," Stop"]}):m.jsxs(mt,{variant:"primary",onClick:w,disabled:!t,children:[m.jsx(J_,{className:"h-4 w-4"})," Auswertung starten"]}),h&&m.jsxs(mt,{variant:"primary",onClick:S,children:[m.jsx(wa,{className:"h-4 w-4"})," Snapshot als Trainingsdaten"]})]}),m.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Figuren aufs Brett stellen — das Modell wertet jedes Feld live aus (Glyph + Farbe = Confidence:",m.jsx("span",{className:"text-green-500",children:" grün"})," hoch · ",m.jsx("span",{className:"text-amber-400",children:"gelb"})," mittel ·",m.jsx("span",{className:"text-red-400",children:" rot"}),' niedrig). „Snapshot" speichert die Stellung als neue Session (Active Learning) — danach im ',m.jsx("b",{className:"text-zinc-300",children:"Review"})," Fehler & verdeckte Felder korrigieren, bevor du darauf neu trainierst."]}),v&&m.jsx("p",{className:"mt-1 text-xs text-sky-400",children:v})]}),m.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_280px]",children:[m.jsx(Ft,{title:"Live-Auswertung",children:h?m.jsx("img",{src:"/api/camera/inference.mjpg",alt:"Live-Inferenz",className:"w-full rounded-lg border border-zinc-800"}):m.jsxs("div",{className:"flex h-72 items-center justify-center text-zinc-500",children:[m.jsx(wa,{className:"mr-2 h-5 w-5"})," Auswertung nicht gestartet"]})}),m.jsx(Ft,{title:"Erkannte Stellung",children:h?m.jsxs("div",{className:"space-y-2 text-sm",children:[m.jsxs("div",{className:"text-zinc-400",children:["Ø Confidence: ",m.jsx("b",{className:"text-zinc-100 tabular-nums",children:x.mean_conf!=null?(x.mean_conf*100).toFixed(0)+" %":"—"})]}),m.jsx("div",{className:"text-zinc-400",children:"FEN (geschätzt):"}),m.jsx("code",{className:"block break-all rounded bg-zinc-950 p-2 text-xs text-zinc-300",children:x.fen??"…"}),m.jsx("p",{className:"text-xs text-zinc-500",children:"verdeckte Felder zählen in der FEN als leer."})]}):m.jsx("span",{className:"text-sm text-zinc-500",children:"Start drücken."})})]})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Am="185",xo={ROTATE:0,DOLLY:1,PAN:2},mo={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Vw=0,Xx=1,Gw=2,Xu=1,jw=2,kl=3,Os=0,hi=1,hr=2,Wr=0,vo=1,$x=2,qx=3,Kx=4,Ww=5,ca=100,Xw=101,$w=102,qw=103,Kw=104,Yw=200,Qw=201,Zw=202,Jw=203,yp=204,Sp=205,eb=206,tb=207,nb=208,ib=209,rb=210,sb=211,ab=212,ob=213,lb=214,Mp=0,Ep=1,wp=2,Io=3,bp=4,Tp=5,Cp=6,Rp=7,Pm=0,cb=1,ub=2,xr=0,ly=1,cy=2,uy=3,Nm=4,dy=5,hy=6,fy=7,py=300,ba=301,Uo=302,gf=303,xf=304,Sd=306,Ap=1e3,jr=1001,Pp=1002,Un=1003,db=1004,mu=1005,jn=1006,vf=1007,ha=1008,Si=1009,my=1010,gy=1011,Xl=1012,Lm=1013,yr=1014,pr=1015,Kr=1016,Dm=1017,Im=1018,$l=1020,xy=35902,vy=35899,_y=1021,yy=1022,Ki=1023,Yr=1026,fa=1027,Sy=1028,Um=1029,Ta=1030,Fm=1031,km=1033,$u=33776,qu=33777,Ku=33778,Yu=33779,Np=35840,Lp=35841,Dp=35842,Ip=35843,Up=36196,Fp=37492,kp=37496,Op=37488,zp=37489,sd=37490,Bp=37491,Hp=37808,Vp=37809,Gp=37810,jp=37811,Wp=37812,Xp=37813,$p=37814,qp=37815,Kp=37816,Yp=37817,Qp=37818,Zp=37819,Jp=37820,em=37821,tm=36492,nm=36494,im=36495,rm=36283,sm=36284,ad=36285,am=36286,hb=3200,od=0,fb=1,Ts="",Jn="srgb",ld="srgb-linear",cd="linear",Gt="srgb",Za=7680,Yx=519,pb=512,mb=513,gb=514,Om=515,xb=516,vb=517,zm=518,_b=519,Qx=35044,Zx="300 es",mr=2e3,ql=2001;function yb(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Kl(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Sb(){const i=Kl("canvas");return i.style.display="block",i}const Jx={};function ev(...i){const e="THREE."+i.shift();console.log(e,...i)}function My(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function lt(...i){i=My(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Dt(...i){i=My(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function _o(...i){const e=i.join(" ");e in Jx||(Jx[e]=!0,lt(...i))}function Mb(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const Eb={[Mp]:Ep,[wp]:Cp,[bp]:Rp,[Io]:Tp,[Ep]:Mp,[Cp]:wp,[Rp]:bp,[Tp]:Io};class Bs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Hn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Qu=Math.PI/180,om=180/Math.PI;function ic(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Hn[i&255]+Hn[i>>8&255]+Hn[i>>16&255]+Hn[i>>24&255]+"-"+Hn[e&255]+Hn[e>>8&255]+"-"+Hn[e>>16&15|64]+Hn[e>>24&255]+"-"+Hn[t&63|128]+Hn[t>>8&255]+"-"+Hn[t>>16&255]+Hn[t>>24&255]+Hn[r&255]+Hn[r>>8&255]+Hn[r>>16&255]+Hn[r>>24&255]).toLowerCase()}function wt(i,e,t){return Math.max(e,Math.min(t,i))}function wb(i,e){return(i%e+e)%e}function _f(i,e,t){return(1-t)*i+t*e}function Rl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function li(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const bb={DEG2RAD:Qu},Wm=class Wm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=wt(this.x,e.x,t.x),this.y=wt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=wt(this.x,e,t),this.y=wt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(wt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(wt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};Wm.prototype.isVector2=!0;let dt=Wm;class zs{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],x=r[a+2],p=r[a+3],v=l[c+0],_=l[c+1],E=l[c+2],w=l[c+3];if(p!==w||h!==v||f!==_||x!==E){let M=h*v+f*_+x*E+p*w;M<0&&(v=-v,_=-_,E=-E,w=-w,M=-M);let S=1-d;if(M<.9995){const A=Math.acos(M),L=Math.sin(A);S=Math.sin(S*A)/L,d=Math.sin(d*A)/L,h=h*S+v*d,f=f*S+_*d,x=x*S+E*d,p=p*S+w*d}else{h=h*S+v*d,f=f*S+_*d,x=x*S+E*d,p=p*S+w*d;const A=1/Math.sqrt(h*h+f*f+x*x+p*p);h*=A,f*=A,x*=A,p*=A}}e[t]=h,e[t+1]=f,e[t+2]=x,e[t+3]=p}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],x=r[a+3],p=l[c],v=l[c+1],_=l[c+2],E=l[c+3];return e[t]=d*E+x*p+h*_-f*v,e[t+1]=h*E+x*v+f*p-d*_,e[t+2]=f*E+x*_+d*v-h*p,e[t+3]=x*E-d*p-h*v-f*_,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),x=d(a/2),p=d(l/2),v=h(r/2),_=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=v*x*p+f*_*E,this._y=f*_*p-v*x*E,this._z=f*x*E+v*_*p,this._w=f*x*p-v*_*E;break;case"YXZ":this._x=v*x*p+f*_*E,this._y=f*_*p-v*x*E,this._z=f*x*E-v*_*p,this._w=f*x*p+v*_*E;break;case"ZXY":this._x=v*x*p-f*_*E,this._y=f*_*p+v*x*E,this._z=f*x*E+v*_*p,this._w=f*x*p-v*_*E;break;case"ZYX":this._x=v*x*p-f*_*E,this._y=f*_*p+v*x*E,this._z=f*x*E-v*_*p,this._w=f*x*p+v*_*E;break;case"YZX":this._x=v*x*p+f*_*E,this._y=f*_*p+v*x*E,this._z=f*x*E-v*_*p,this._w=f*x*p-v*_*E;break;case"XZY":this._x=v*x*p-f*_*E,this._y=f*_*p-v*x*E,this._z=f*x*E+v*_*p,this._w=f*x*p+v*_*E;break;default:lt("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],x=t[6],p=t[10],v=r+d+p;if(v>0){const _=.5/Math.sqrt(v+1);this._w=.25/_,this._x=(x-h)*_,this._y=(l-f)*_,this._z=(c-a)*_}else if(r>d&&r>p){const _=2*Math.sqrt(1+r-d-p);this._w=(x-h)/_,this._x=.25*_,this._y=(a+c)/_,this._z=(l+f)/_}else if(d>p){const _=2*Math.sqrt(1+d-r-p);this._w=(l-f)/_,this._x=(a+c)/_,this._y=.25*_,this._z=(h+x)/_}else{const _=2*Math.sqrt(1+p-r-d);this._w=(c-a)/_,this._x=(l+f)/_,this._y=(h+x)/_,this._z=.25*_}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(wt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,x=t._w;return this._x=r*x+c*d+a*f-l*h,this._y=a*x+c*h+l*d-r*f,this._z=l*x+c*f+r*h-a*d,this._w=c*x-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),x=Math.sin(f);h=Math.sin(h*f)/x,t=Math.sin(t*f)/x,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Xm=class Xm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(tv.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(tv.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),x=2*(d*t-l*a),p=2*(l*r-c*t);return this.x=t+h*f+c*p-d*x,this.y=r+h*x+d*f-l*p,this.z=a+h*p+l*x-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=wt(this.x,e.x,t.x),this.y=wt(this.y,e.y,t.y),this.z=wt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=wt(this.x,e,t),this.y=wt(this.y,e,t),this.z=wt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(wt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return yf.copy(this).projectOnVector(e),this.sub(yf)}reflect(e){return this.sub(yf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(wt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Xm.prototype.isVector3=!0;let ne=Xm;const yf=new ne,tv=new zs,$m=class $m{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const x=this.elements;return x[0]=e,x[1]=a,x[2]=d,x[3]=t,x[4]=l,x[5]=h,x[6]=r,x[7]=c,x[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],x=r[4],p=r[7],v=r[2],_=r[5],E=r[8],w=a[0],M=a[3],S=a[6],A=a[1],L=a[4],C=a[7],I=a[2],N=a[5],U=a[8];return l[0]=c*w+d*A+h*I,l[3]=c*M+d*L+h*N,l[6]=c*S+d*C+h*U,l[1]=f*w+x*A+p*I,l[4]=f*M+x*L+p*N,l[7]=f*S+x*C+p*U,l[2]=v*w+_*A+E*I,l[5]=v*M+_*L+E*N,l[8]=v*S+_*C+E*U,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],x=e[8];return t*c*x-t*d*f-r*l*x+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],x=e[8],p=x*c-d*f,v=d*h-x*l,_=f*l-c*h,E=t*p+r*v+a*_;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const w=1/E;return e[0]=p*w,e[1]=(a*f-x*r)*w,e[2]=(d*r-a*c)*w,e[3]=v*w,e[4]=(x*t-a*h)*w,e[5]=(a*l-d*t)*w,e[6]=_*w,e[7]=(r*h-f*t)*w,e[8]=(c*t-r*l)*w,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return _o("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Sf.makeScale(e,t)),this}rotate(e){return _o("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Sf.makeRotation(-e)),this}translate(e,t){return _o("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Sf.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};$m.prototype.isMatrix3=!0;let pt=$m;const Sf=new pt,nv=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),iv=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Tb(){const i={enabled:!0,workingColorSpace:ld,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Gt&&(a.r=Xr(a.r),a.g=Xr(a.g),a.b=Xr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Gt&&(a.r=yo(a.r),a.g=yo(a.g),a.b=yo(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===Ts?cd:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return _o("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return _o("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[ld]:{primaries:e,whitePoint:r,transfer:cd,toXYZ:nv,fromXYZ:iv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Jn},outputColorSpaceConfig:{drawingBufferColorSpace:Jn}},[Jn]:{primaries:e,whitePoint:r,transfer:Gt,toXYZ:nv,fromXYZ:iv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Jn}}}),i}const Ct=Tb();function Xr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function yo(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Ja;class Cb{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Ja===void 0&&(Ja=Kl("canvas")),Ja.width=e.width,Ja.height=e.height;const a=Ja.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Ja}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Kl("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Xr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Xr(t[r]/255)*255):t[r]=Xr(t[r]);return{data:t,width:e.width,height:e.height}}else return lt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Rb=0;class Bm{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Rb++}),this.uuid=ic(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(Mf(a[c].image)):l.push(Mf(a[c]))}else l=Mf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function Mf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Cb.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(lt("Texture: Unable to serialize Texture."),{})}let Ab=0;const Ef=new ne;class Wn extends Bs{constructor(e=Wn.DEFAULT_IMAGE,t=Wn.DEFAULT_MAPPING,r=jr,a=jr,l=jn,c=ha,d=Ki,h=Si,f=Wn.DEFAULT_ANISOTROPY,x=Ts){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ab++}),this.uuid=ic(),this.name="",this.source=new Bm(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new dt(0,0),this.repeat=new dt(1,1),this.center=new dt(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=x,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Ef).x}get height(){return this.source.getSize(Ef).y}get depth(){return this.source.getSize(Ef).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){lt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==py)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ap:e.x=e.x-Math.floor(e.x);break;case jr:e.x=e.x<0?0:1;break;case Pp:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ap:e.y=e.y-Math.floor(e.y);break;case jr:e.y=e.y<0?0:1;break;case Pp:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Wn.DEFAULT_IMAGE=null;Wn.DEFAULT_MAPPING=py;Wn.DEFAULT_ANISOTROPY=1;const qm=class qm{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],x=h[4],p=h[8],v=h[1],_=h[5],E=h[9],w=h[2],M=h[6],S=h[10];if(Math.abs(x-v)<.01&&Math.abs(p-w)<.01&&Math.abs(E-M)<.01){if(Math.abs(x+v)<.1&&Math.abs(p+w)<.1&&Math.abs(E+M)<.1&&Math.abs(f+_+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const L=(f+1)/2,C=(_+1)/2,I=(S+1)/2,N=(x+v)/4,U=(p+w)/4,b=(E+M)/4;return L>C&&L>I?L<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(L),a=N/r,l=U/r):C>I?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=N/a,l=b/a):I<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(I),r=U/l,a=b/l),this.set(r,a,l,t),this}let A=Math.sqrt((M-E)*(M-E)+(p-w)*(p-w)+(v-x)*(v-x));return Math.abs(A)<.001&&(A=1),this.x=(M-E)/A,this.y=(p-w)/A,this.z=(v-x)/A,this.w=Math.acos((f+_+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=wt(this.x,e.x,t.x),this.y=wt(this.y,e.y,t.y),this.z=wt(this.z,e.z,t.z),this.w=wt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=wt(this.x,e,t),this.y=wt(this.y,e,t),this.z=wt(this.z,e,t),this.w=wt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(wt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};qm.prototype.isVector4=!0;let dn=qm;class Pb extends Bs{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:jn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new dn(0,0,e,t),this.scissorTest=!1,this.viewport=new dn(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Wn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:jn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new Bm(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vr extends Pb{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class Ey extends Wn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=jr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Nb extends Wn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=jr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const fd=class fd{constructor(e,t,r,a,l,c,d,h,f,x,p,v,_,E,w,M){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,x,p,v,_,E,w,M)}set(e,t,r,a,l,c,d,h,f,x,p,v,_,E,w,M){const S=this.elements;return S[0]=e,S[4]=t,S[8]=r,S[12]=a,S[1]=l,S[5]=c,S[9]=d,S[13]=h,S[2]=f,S[6]=x,S[10]=p,S[14]=v,S[3]=_,S[7]=E,S[11]=w,S[15]=M,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new fd().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/eo.setFromMatrixColumn(e,0).length(),l=1/eo.setFromMatrixColumn(e,1).length(),c=1/eo.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),x=Math.cos(l),p=Math.sin(l);if(e.order==="XYZ"){const v=c*x,_=c*p,E=d*x,w=d*p;t[0]=h*x,t[4]=-h*p,t[8]=f,t[1]=_+E*f,t[5]=v-w*f,t[9]=-d*h,t[2]=w-v*f,t[6]=E+_*f,t[10]=c*h}else if(e.order==="YXZ"){const v=h*x,_=h*p,E=f*x,w=f*p;t[0]=v+w*d,t[4]=E*d-_,t[8]=c*f,t[1]=c*p,t[5]=c*x,t[9]=-d,t[2]=_*d-E,t[6]=w+v*d,t[10]=c*h}else if(e.order==="ZXY"){const v=h*x,_=h*p,E=f*x,w=f*p;t[0]=v-w*d,t[4]=-c*p,t[8]=E+_*d,t[1]=_+E*d,t[5]=c*x,t[9]=w-v*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const v=c*x,_=c*p,E=d*x,w=d*p;t[0]=h*x,t[4]=E*f-_,t[8]=v*f+w,t[1]=h*p,t[5]=w*f+v,t[9]=_*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const v=c*h,_=c*f,E=d*h,w=d*f;t[0]=h*x,t[4]=w-v*p,t[8]=E*p+_,t[1]=p,t[5]=c*x,t[9]=-d*x,t[2]=-f*x,t[6]=_*p+E,t[10]=v-w*p}else if(e.order==="XZY"){const v=c*h,_=c*f,E=d*h,w=d*f;t[0]=h*x,t[4]=-p,t[8]=f*x,t[1]=v*p+w,t[5]=c*x,t[9]=_*p-E,t[2]=E*p-_,t[6]=d*x,t[10]=w*p+v}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Lb,e,Db)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),xs.crossVectors(r,xi),xs.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),xs.crossVectors(r,xi)),xs.normalize(),gu.crossVectors(xi,xs),a[0]=xs.x,a[4]=gu.x,a[8]=xi.x,a[1]=xs.y,a[5]=gu.y,a[9]=xi.y,a[2]=xs.z,a[6]=gu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],x=r[1],p=r[5],v=r[9],_=r[13],E=r[2],w=r[6],M=r[10],S=r[14],A=r[3],L=r[7],C=r[11],I=r[15],N=a[0],U=a[4],b=a[8],D=a[12],O=a[1],V=a[5],W=a[9],j=a[13],ue=a[2],q=a[6],pe=a[10],J=a[14],K=a[3],re=a[7],he=a[11],z=a[15];return l[0]=c*N+d*O+h*ue+f*K,l[4]=c*U+d*V+h*q+f*re,l[8]=c*b+d*W+h*pe+f*he,l[12]=c*D+d*j+h*J+f*z,l[1]=x*N+p*O+v*ue+_*K,l[5]=x*U+p*V+v*q+_*re,l[9]=x*b+p*W+v*pe+_*he,l[13]=x*D+p*j+v*J+_*z,l[2]=E*N+w*O+M*ue+S*K,l[6]=E*U+w*V+M*q+S*re,l[10]=E*b+w*W+M*pe+S*he,l[14]=E*D+w*j+M*J+S*z,l[3]=A*N+L*O+C*ue+I*K,l[7]=A*U+L*V+C*q+I*re,l[11]=A*b+L*W+C*pe+I*he,l[15]=A*D+L*j+C*J+I*z,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],x=e[2],p=e[6],v=e[10],_=e[14],E=e[3],w=e[7],M=e[11],S=e[15],A=h*_-f*v,L=d*_-f*p,C=d*v-h*p,I=c*_-f*x,N=c*v-h*x,U=c*p-d*x;return t*(w*A-M*L+S*C)-r*(E*A-M*I+S*N)+a*(E*L-w*I+S*U)-l*(E*C-w*N+M*U)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],x=e[10];return t*(c*x-d*f)-r*(l*x-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],x=e[8],p=e[9],v=e[10],_=e[11],E=e[12],w=e[13],M=e[14],S=e[15],A=t*d-r*c,L=t*h-a*c,C=t*f-l*c,I=r*h-a*d,N=r*f-l*d,U=a*f-l*h,b=x*w-p*E,D=x*M-v*E,O=x*S-_*E,V=p*M-v*w,W=p*S-_*w,j=v*S-_*M,ue=A*j-L*W+C*V+I*O-N*D+U*b;if(ue===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const q=1/ue;return e[0]=(d*j-h*W+f*V)*q,e[1]=(a*W-r*j-l*V)*q,e[2]=(w*U-M*N+S*I)*q,e[3]=(v*N-p*U-_*I)*q,e[4]=(h*O-c*j-f*D)*q,e[5]=(t*j-a*O+l*D)*q,e[6]=(M*C-E*U-S*L)*q,e[7]=(x*U-v*C+_*L)*q,e[8]=(c*W-d*O+f*b)*q,e[9]=(r*O-t*W-l*b)*q,e[10]=(E*N-w*C+S*A)*q,e[11]=(p*C-x*N-_*A)*q,e[12]=(d*D-c*V-h*b)*q,e[13]=(t*V-r*D+a*b)*q,e[14]=(w*L-E*I-M*A)*q,e[15]=(x*I-p*L+v*A)*q,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,x=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,x*d+r,x*h-a*c,0,f*h-a*d,x*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,x=c+c,p=d+d,v=l*f,_=l*x,E=l*p,w=c*x,M=c*p,S=d*p,A=h*f,L=h*x,C=h*p,I=r.x,N=r.y,U=r.z;return a[0]=(1-(w+S))*I,a[1]=(_+C)*I,a[2]=(E-L)*I,a[3]=0,a[4]=(_-C)*N,a[5]=(1-(v+S))*N,a[6]=(M+A)*N,a[7]=0,a[8]=(E+L)*U,a[9]=(M-A)*U,a[10]=(1-(v+w))*U,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=eo.set(a[0],a[1],a[2]).length();const d=eo.set(a[4],a[5],a[6]).length(),h=eo.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,x=1/d,p=1/h;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=x,ji.elements[5]*=x,ji.elements[6]*=x,ji.elements[8]*=p,ji.elements[9]*=p,ji.elements[10]*=p,t.setFromRotationMatrix(ji),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=mr,h=!1){const f=this.elements,x=2*l/(t-e),p=2*l/(r-a),v=(t+e)/(t-e),_=(r+a)/(r-a);let E,w;if(h)E=l/(c-l),w=c*l/(c-l);else if(d===mr)E=-(c+l)/(c-l),w=-2*c*l/(c-l);else if(d===ql)E=-c/(c-l),w=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=x,f[4]=0,f[8]=v,f[12]=0,f[1]=0,f[5]=p,f[9]=_,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=mr,h=!1){const f=this.elements,x=2/(t-e),p=2/(r-a),v=-(t+e)/(t-e),_=-(r+a)/(r-a);let E,w;if(h)E=1/(c-l),w=c/(c-l);else if(d===mr)E=-2/(c-l),w=-(c+l)/(c-l);else if(d===ql)E=-1/(c-l),w=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=x,f[4]=0,f[8]=0,f[12]=v,f[1]=0,f[5]=p,f[9]=0,f[13]=_,f[2]=0,f[6]=0,f[10]=E,f[14]=w,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};fd.prototype.isMatrix4=!0;let on=fd;const eo=new ne,ji=new on,Lb=new ne(0,0,0),Db=new ne(1,1,1),xs=new ne,gu=new ne,xi=new ne,rv=new on,sv=new zs;class Qr{constructor(e=0,t=0,r=0,a=Qr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],x=a[9],p=a[2],v=a[6],_=a[10];switch(t){case"XYZ":this._y=Math.asin(wt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-x,_),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(v,f),this._z=0);break;case"YXZ":this._x=Math.asin(-wt(x,-1,1)),Math.abs(x)<.9999999?(this._y=Math.atan2(d,_),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-p,l),this._z=0);break;case"ZXY":this._x=Math.asin(wt(v,-1,1)),Math.abs(v)<.9999999?(this._y=Math.atan2(-p,_),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-wt(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(v,_),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(wt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-x,f),this._y=Math.atan2(-p,l)):(this._x=0,this._y=Math.atan2(d,_));break;case"XZY":this._z=Math.asin(-wt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(v,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-x,_),this._y=0);break;default:lt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return rv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(rv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return sv.setFromEuler(this),this.setFromQuaternion(sv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Qr.DEFAULT_ORDER="XYZ";class wy{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Ib=0;const av=new ne,to=new zs,Lr=new on,xu=new ne,Al=new ne,Ub=new ne,Fb=new zs,ov=new ne(1,0,0),lv=new ne(0,1,0),cv=new ne(0,0,1),uv={type:"added"},kb={type:"removed"},no={type:"childadded",child:null},wf={type:"childremoved",child:null};class En extends Bs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Ib++}),this.uuid=ic(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=En.DEFAULT_UP.clone();const e=new ne,t=new Qr,r=new zs,a=new ne(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new on},normalMatrix:{value:new pt}}),this.matrix=new on,this.matrixWorld=new on,this.matrixAutoUpdate=En.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new wy,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return to.setFromAxisAngle(e,t),this.quaternion.multiply(to),this}rotateOnWorldAxis(e,t){return to.setFromAxisAngle(e,t),this.quaternion.premultiply(to),this}rotateX(e){return this.rotateOnAxis(ov,e)}rotateY(e){return this.rotateOnAxis(lv,e)}rotateZ(e){return this.rotateOnAxis(cv,e)}translateOnAxis(e,t){return av.copy(e).applyQuaternion(this.quaternion),this.position.add(av.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ov,e)}translateY(e){return this.translateOnAxis(lv,e)}translateZ(e){return this.translateOnAxis(cv,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Lr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?xu.copy(e):xu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Al.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Lr.lookAt(Al,xu,this.up):Lr.lookAt(xu,Al,this.up),this.quaternion.setFromRotationMatrix(Lr),a&&(Lr.extractRotation(a.matrixWorld),to.setFromRotationMatrix(Lr),this.quaternion.premultiply(to.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Dt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(uv),no.child=e,this.dispatchEvent(no),no.child=null):Dt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(kb),wf.child=e,this.dispatchEvent(wf),wf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Lr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Lr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Lr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(uv),no.child=e,this.dispatchEvent(no),no.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Al,e,Ub),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Al,Fb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,x=h.length;f<x;f++){const p=h[f];l(e.shapes,p)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),x=c(e.images),p=c(e.shapes),v=c(e.skeletons),_=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),x.length>0&&(r.images=x),p.length>0&&(r.shapes=p),v.length>0&&(r.skeletons=v),_.length>0&&(r.animations=_),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const x=d[f];delete x.metadata,h.push(x)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}En.DEFAULT_UP=new ne(0,1,0);En.DEFAULT_MATRIX_AUTO_UPDATE=!0;En.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Ol extends En{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ob={type:"move"};class bf{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ol,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ol,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ne,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ne),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ol,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ne,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ne,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const w of e.hand.values()){const M=t.getJointPose(w,r),S=this._getHandJoint(f,w);M!==null&&(S.matrix.fromArray(M.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=M.radius),S.visible=M!==null}const x=f.joints["index-finger-tip"],p=f.joints["thumb-tip"],v=x.position.distanceTo(p.position),_=.02,E=.005;f.inputState.pinching&&v>_+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&v<=_-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(Ob)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Ol;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const by={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},vs={h:0,s:0,l:0},vu={h:0,s:0,l:0};function Tf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class vt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Jn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ct.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=Ct.workingColorSpace){return this.r=e,this.g=t,this.b=r,Ct.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=Ct.workingColorSpace){if(e=wb(e,1),t=wt(t,0,1),r=wt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=Tf(c,l,e+1/3),this.g=Tf(c,l,e),this.b=Tf(c,l,e-1/3)}return Ct.colorSpaceToWorking(this,a),this}setStyle(e,t=Jn){function r(l){l!==void 0&&parseFloat(l)<1&&lt("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:lt("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);lt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Jn){const r=by[e.toLowerCase()];return r!==void 0?this.setHex(r,t):lt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Xr(e.r),this.g=Xr(e.g),this.b=Xr(e.b),this}copyLinearToSRGB(e){return this.r=yo(e.r),this.g=yo(e.g),this.b=yo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Jn){return Ct.workingToColorSpace(Vn.copy(this),e),Math.round(wt(Vn.r*255,0,255))*65536+Math.round(wt(Vn.g*255,0,255))*256+Math.round(wt(Vn.b*255,0,255))}getHexString(e=Jn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ct.workingColorSpace){Ct.workingToColorSpace(Vn.copy(this),t);const r=Vn.r,a=Vn.g,l=Vn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const x=(d+c)/2;if(d===c)h=0,f=0;else{const p=c-d;switch(f=x<=.5?p/(c+d):p/(2-c-d),c){case r:h=(a-l)/p+(a<l?6:0);break;case a:h=(l-r)/p+2;break;case l:h=(r-a)/p+4;break}h/=6}return e.h=h,e.s=f,e.l=x,e}getRGB(e,t=Ct.workingColorSpace){return Ct.workingToColorSpace(Vn.copy(this),t),e.r=Vn.r,e.g=Vn.g,e.b=Vn.b,e}getStyle(e=Jn){Ct.workingToColorSpace(Vn.copy(this),e);const t=Vn.r,r=Vn.g,a=Vn.b;return e!==Jn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(vs),this.setHSL(vs.h+e,vs.s+t,vs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(vs),e.getHSL(vu);const r=_f(vs.h,vu.h,t),a=_f(vs.s,vu.s,t),l=_f(vs.l,vu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Vn=new vt;vt.NAMES=by;class zb extends En{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Qr,this.environmentIntensity=1,this.environmentRotation=new Qr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new ne,Dr=new ne,Cf=new ne,Ir=new ne,io=new ne,ro=new ne,dv=new ne,Rf=new ne,Af=new ne,Pf=new ne,Nf=new dn,Lf=new dn,Df=new dn;class qi{constructor(e=new ne,t=new ne,r=new ne){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Dr.subVectors(r,t),Cf.subVectors(e,t);const c=Wi.dot(Wi),d=Wi.dot(Dr),h=Wi.dot(Cf),f=Dr.dot(Dr),x=Dr.dot(Cf),p=c*f-d*d;if(p===0)return l.set(0,0,0),null;const v=1/p,_=(f*h-d*x)*v,E=(c*x-d*h)*v;return l.set(1-_-E,E,_)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Ir)===null?!1:Ir.x>=0&&Ir.y>=0&&Ir.x+Ir.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Ir)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Ir.x),h.addScaledVector(c,Ir.y),h.addScaledVector(d,Ir.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Nf.setScalar(0),Lf.setScalar(0),Df.setScalar(0),Nf.fromBufferAttribute(e,t),Lf.fromBufferAttribute(e,r),Df.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Nf,l.x),c.addScaledVector(Lf,l.y),c.addScaledVector(Df,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Dr.subVectors(e,t),Wi.cross(Dr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Dr.subVectors(this.a,this.b),Wi.cross(Dr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return qi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return qi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return qi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return qi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return qi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;io.subVectors(a,r),ro.subVectors(l,r),Rf.subVectors(e,r);const h=io.dot(Rf),f=ro.dot(Rf);if(h<=0&&f<=0)return t.copy(r);Af.subVectors(e,a);const x=io.dot(Af),p=ro.dot(Af);if(x>=0&&p<=x)return t.copy(a);const v=h*p-x*f;if(v<=0&&h>=0&&x<=0)return c=h/(h-x),t.copy(r).addScaledVector(io,c);Pf.subVectors(e,l);const _=io.dot(Pf),E=ro.dot(Pf);if(E>=0&&_<=E)return t.copy(l);const w=_*f-h*E;if(w<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(ro,d);const M=x*E-_*p;if(M<=0&&p-x>=0&&_-E>=0)return dv.subVectors(l,a),d=(p-x)/(p-x+(_-E)),t.copy(a).addScaledVector(dv,d);const S=1/(M+w+v);return c=w*S,d=v*S,t.copy(r).addScaledVector(io,c).addScaledVector(ro,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Go{constructor(e=new ne(1/0,1/0,1/0),t=new ne(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),_u.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),_u.copy(r.boundingBox)),_u.applyMatrix4(e.matrixWorld),this.union(_u)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Pl),yu.subVectors(this.max,Pl),so.subVectors(e.a,Pl),ao.subVectors(e.b,Pl),oo.subVectors(e.c,Pl),_s.subVectors(ao,so),ys.subVectors(oo,ao),sa.subVectors(so,oo);let t=[0,-_s.z,_s.y,0,-ys.z,ys.y,0,-sa.z,sa.y,_s.z,0,-_s.x,ys.z,0,-ys.x,sa.z,0,-sa.x,-_s.y,_s.x,0,-ys.y,ys.x,0,-sa.y,sa.x,0];return!If(t,so,ao,oo,yu)||(t=[1,0,0,0,1,0,0,0,1],!If(t,so,ao,oo,yu))?!1:(Su.crossVectors(_s,ys),t=[Su.x,Su.y,Su.z],If(t,so,ao,oo,yu))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ur[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ur[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ur[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ur[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ur[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ur[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ur[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ur[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ur),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Ur=[new ne,new ne,new ne,new ne,new ne,new ne,new ne,new ne],Xi=new ne,_u=new Go,so=new ne,ao=new ne,oo=new ne,_s=new ne,ys=new ne,sa=new ne,Pl=new ne,yu=new ne,Su=new ne,aa=new ne;function If(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){aa.fromArray(i,l);const d=a.x*Math.abs(aa.x)+a.y*Math.abs(aa.y)+a.z*Math.abs(aa.z),h=e.dot(aa),f=t.dot(aa),x=r.dot(aa);if(Math.max(-Math.max(h,f,x),Math.min(h,f,x))>d)return!1}return!0}const vn=new ne,Mu=new dt;let Bb=0;class _r extends Bs{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Bb++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=Qx,this.updateRanges=[],this.gpuType=pr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)Mu.fromBufferAttribute(this,t),Mu.applyMatrix3(e),this.setXY(t,Mu.x,Mu.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix3(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyMatrix4(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.applyNormalMatrix(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)vn.fromBufferAttribute(this,t),vn.transformDirection(e),this.setXYZ(t,vn.x,vn.y,vn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Rl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=li(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Rl(t,this.array)),t}setX(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Rl(t,this.array)),t}setY(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Rl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Rl(t,this.array)),t}setW(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array),l=li(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Qx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class Ty extends _r{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class Cy extends _r{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class In extends _r{constructor(e,t,r){super(new Float32Array(e),t,r)}}const Hb=new Go,Nl=new ne,Uf=new ne;class rc{constructor(e=new ne,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):Hb.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Nl.subVectors(e,this.center);const t=Nl.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Nl,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Uf.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Nl.copy(e.center).add(Uf)),this.expandByPoint(Nl.copy(e.center).sub(Uf))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let Vb=0;const Ni=new on,Ff=new En,lo=new ne,vi=new Go,Ll=new Go,An=new ne;class Mi extends Bs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Vb++}),this.uuid=ic(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(yb(e)?Cy:Ty)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return Ff.lookAt(e),Ff.updateMatrix(),this.applyMatrix4(Ff.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(lo).negate(),this.translate(lo.x,lo.y,lo.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new In(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&lt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Go);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ne(-1/0,-1/0,-1/0),new ne(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(An.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(An),An.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(An)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Dt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new rc);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Dt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ne,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Ll.setFromBufferAttribute(d),this.morphTargetsRelative?(An.addVectors(vi.min,Ll.min),vi.expandByPoint(An),An.addVectors(vi.max,Ll.max),vi.expandByPoint(An)):(vi.expandByPoint(Ll.min),vi.expandByPoint(Ll.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)An.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(An));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,x=d.count;f<x;f++)An.fromBufferAttribute(d,f),h&&(lo.fromBufferAttribute(e,f),An.add(lo)),a=Math.max(a,r.distanceToSquared(An))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Dt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Dt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new _r(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let b=0;b<r.count;b++)d[b]=new ne,h[b]=new ne;const f=new ne,x=new ne,p=new ne,v=new dt,_=new dt,E=new dt,w=new ne,M=new ne;function S(b,D,O){f.fromBufferAttribute(r,b),x.fromBufferAttribute(r,D),p.fromBufferAttribute(r,O),v.fromBufferAttribute(l,b),_.fromBufferAttribute(l,D),E.fromBufferAttribute(l,O),x.sub(f),p.sub(f),_.sub(v),E.sub(v);const V=1/(_.x*E.y-E.x*_.y);isFinite(V)&&(w.copy(x).multiplyScalar(E.y).addScaledVector(p,-_.y).multiplyScalar(V),M.copy(p).multiplyScalar(_.x).addScaledVector(x,-E.x).multiplyScalar(V),d[b].add(w),d[D].add(w),d[O].add(w),h[b].add(M),h[D].add(M),h[O].add(M))}let A=this.groups;A.length===0&&(A=[{start:0,count:e.count}]);for(let b=0,D=A.length;b<D;++b){const O=A[b],V=O.start,W=O.count;for(let j=V,ue=V+W;j<ue;j+=3)S(e.getX(j+0),e.getX(j+1),e.getX(j+2))}const L=new ne,C=new ne,I=new ne,N=new ne;function U(b){I.fromBufferAttribute(a,b),N.copy(I);const D=d[b];L.copy(D),L.sub(I.multiplyScalar(I.dot(D))).normalize(),C.crossVectors(N,D);const V=C.dot(h[b])<0?-1:1;c.setXYZW(b,L.x,L.y,L.z,V)}for(let b=0,D=A.length;b<D;++b){const O=A[b],V=O.start,W=O.count;for(let j=V,ue=V+W;j<ue;j+=3)U(e.getX(j+0)),U(e.getX(j+1)),U(e.getX(j+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new _r(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let v=0,_=r.count;v<_;v++)r.setXYZ(v,0,0,0);const a=new ne,l=new ne,c=new ne,d=new ne,h=new ne,f=new ne,x=new ne,p=new ne;if(e)for(let v=0,_=e.count;v<_;v+=3){const E=e.getX(v+0),w=e.getX(v+1),M=e.getX(v+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,w),c.fromBufferAttribute(t,M),x.subVectors(c,l),p.subVectors(a,l),x.cross(p),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,w),f.fromBufferAttribute(r,M),d.add(x),h.add(x),f.add(x),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(w,h.x,h.y,h.z),r.setXYZ(M,f.x,f.y,f.z)}else for(let v=0,_=t.count;v<_;v+=3)a.fromBufferAttribute(t,v+0),l.fromBufferAttribute(t,v+1),c.fromBufferAttribute(t,v+2),x.subVectors(c,l),p.subVectors(a,l),x.cross(p),r.setXYZ(v+0,x.x,x.y,x.z),r.setXYZ(v+1,x.x,x.y,x.z),r.setXYZ(v+2,x.x,x.y,x.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)An.fromBufferAttribute(e,t),An.normalize(),e.setXYZ(t,An.x,An.y,An.z)}toNonIndexed(){function e(d,h){const f=d.array,x=d.itemSize,p=d.normalized,v=new f.constructor(h.length*x);let _=0,E=0;for(let w=0,M=h.length;w<M;w++){d.isInterleavedBufferAttribute?_=h[w]*d.data.stride+d.offset:_=h[w]*x;for(let S=0;S<x;S++)v[E++]=f[_++]}return new _r(v,x,p)}if(this.index===null)return lt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let x=0,p=f.length;x<p;x++){const v=f[x],_=e(v,r);h.push(_)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],x=[];for(let p=0,v=f.length;p<v;p++){const _=f[p];x.push(_.toJSON(e.data))}x.length>0&&(a[h]=x,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const x=a[f];this.setAttribute(f,x.clone(t))}const l=e.morphAttributes;for(const f in l){const x=[],p=l[f];for(let v=0,_=p.length;v<_;v++)x.push(p[v].clone(t));this.morphAttributes[f]=x}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,x=c.length;f<x;f++){const p=c[f];this.addGroup(p.start,p.count,p.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let Gb=0;class Sr extends Bs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Gb++}),this.uuid=ic(),this.name="",this.type="Material",this.blending=vo,this.side=Os,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=yp,this.blendDst=Sp,this.blendEquation=ca,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new vt(0,0,0),this.blendAlpha=0,this.depthFunc=Io,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Yx,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Za,this.stencilZFail=Za,this.stencilZPass=Za,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){lt(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){lt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==vo&&(r.blending=this.blending),this.side!==Os&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==yp&&(r.blendSrc=this.blendSrc),this.blendDst!==Sp&&(r.blendDst=this.blendDst),this.blendEquation!==ca&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Io&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Yx&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Za&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Za&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Za&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new vt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new dt().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new dt().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Fr=new ne,kf=new ne,Eu=new ne,Ss=new ne,Of=new ne,wu=new ne,zf=new ne;class Md{constructor(e=new ne,t=new ne(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Fr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Fr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Fr.copy(this.origin).addScaledVector(this.direction,t),Fr.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){kf.copy(e).add(t).multiplyScalar(.5),Eu.copy(t).sub(e).normalize(),Ss.copy(this.origin).sub(kf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Eu),d=Ss.dot(this.direction),h=-Ss.dot(Eu),f=Ss.lengthSq(),x=Math.abs(1-c*c);let p,v,_,E;if(x>0)if(p=c*h-d,v=c*d-h,E=l*x,p>=0)if(v>=-E)if(v<=E){const w=1/x;p*=w,v*=w,_=p*(p+c*v+2*d)+v*(c*p+v+2*h)+f}else v=l,p=Math.max(0,-(c*v+d)),_=-p*p+v*(v+2*h)+f;else v=-l,p=Math.max(0,-(c*v+d)),_=-p*p+v*(v+2*h)+f;else v<=-E?(p=Math.max(0,-(-c*l+d)),v=p>0?-l:Math.min(Math.max(-l,-h),l),_=-p*p+v*(v+2*h)+f):v<=E?(p=0,v=Math.min(Math.max(-l,-h),l),_=v*(v+2*h)+f):(p=Math.max(0,-(c*l+d)),v=p>0?l:Math.min(Math.max(-l,-h),l),_=-p*p+v*(v+2*h)+f);else v=c>0?-l:l,p=Math.max(0,-(c*v+d)),_=-p*p+v*(v+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,p),a&&a.copy(kf).addScaledVector(Eu,v),_}intersectSphere(e,t){Fr.subVectors(e.center,this.origin);const r=Fr.dot(this.direction),a=Fr.dot(Fr)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,x=1/this.direction.y,p=1/this.direction.z,v=this.origin;return f>=0?(r=(e.min.x-v.x)*f,a=(e.max.x-v.x)*f):(r=(e.max.x-v.x)*f,a=(e.min.x-v.x)*f),x>=0?(l=(e.min.y-v.y)*x,c=(e.max.y-v.y)*x):(l=(e.max.y-v.y)*x,c=(e.min.y-v.y)*x),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),p>=0?(d=(e.min.z-v.z)*p,h=(e.max.z-v.z)*p):(d=(e.max.z-v.z)*p,h=(e.min.z-v.z)*p),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Fr)!==null}intersectTriangle(e,t,r,a,l){Of.subVectors(t,e),wu.subVectors(r,e),zf.crossVectors(Of,wu);let c=this.direction.dot(zf),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;Ss.subVectors(this.origin,e);const h=d*this.direction.dot(wu.crossVectors(Ss,wu));if(h<0)return null;const f=d*this.direction.dot(Of.cross(Ss));if(f<0||h+f>c)return null;const x=-d*Ss.dot(zf);return x<0?null:this.at(x/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ry extends Sr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new vt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qr,this.combine=Pm,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const hv=new on,oa=new Md,bu=new rc,fv=new ne,Tu=new ne,Cu=new ne,Ru=new ne,Bf=new ne,Au=new ne,pv=new ne,Pu=new ne;class Qi extends En{constructor(e=new Mi,t=new Ry){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Au.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const x=d[h],p=l[h];x!==0&&(Bf.fromBufferAttribute(p,e),c?Au.addScaledVector(Bf,x):Au.addScaledVector(Bf.sub(t),x))}t.add(Au)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),bu.copy(r.boundingSphere),bu.applyMatrix4(l),oa.copy(e.ray).recast(e.near),!(bu.containsPoint(oa.origin)===!1&&(oa.intersectSphere(bu,fv)===null||oa.origin.distanceToSquared(fv)>(e.far-e.near)**2))&&(hv.copy(l).invert(),oa.copy(e.ray).applyMatrix4(hv),!(r.boundingBox!==null&&oa.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,oa)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,x=l.attributes.uv1,p=l.attributes.normal,v=l.groups,_=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,w=v.length;E<w;E++){const M=v[E],S=c[M.materialIndex],A=Math.max(M.start,_.start),L=Math.min(d.count,Math.min(M.start+M.count,_.start+_.count));for(let C=A,I=L;C<I;C+=3){const N=d.getX(C),U=d.getX(C+1),b=d.getX(C+2);a=Nu(this,S,e,r,f,x,p,N,U,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=M.materialIndex,t.push(a))}}else{const E=Math.max(0,_.start),w=Math.min(d.count,_.start+_.count);for(let M=E,S=w;M<S;M+=3){const A=d.getX(M),L=d.getX(M+1),C=d.getX(M+2);a=Nu(this,c,e,r,f,x,p,A,L,C),a&&(a.faceIndex=Math.floor(M/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,w=v.length;E<w;E++){const M=v[E],S=c[M.materialIndex],A=Math.max(M.start,_.start),L=Math.min(h.count,Math.min(M.start+M.count,_.start+_.count));for(let C=A,I=L;C<I;C+=3){const N=C,U=C+1,b=C+2;a=Nu(this,S,e,r,f,x,p,N,U,b),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=M.materialIndex,t.push(a))}}else{const E=Math.max(0,_.start),w=Math.min(h.count,_.start+_.count);for(let M=E,S=w;M<S;M+=3){const A=M,L=M+1,C=M+2;a=Nu(this,c,e,r,f,x,p,A,L,C),a&&(a.faceIndex=Math.floor(M/3),t.push(a))}}}}function jb(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Os,d),h===null)return null;Pu.copy(d),Pu.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Pu);return f<t.near||f>t.far?null:{distance:f,point:Pu.clone(),object:i}}function Nu(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,Tu),i.getVertexPosition(h,Cu),i.getVertexPosition(f,Ru);const x=jb(i,e,t,r,Tu,Cu,Ru,pv);if(x){const p=new ne;qi.getBarycoord(pv,Tu,Cu,Ru,p),a&&(x.uv=qi.getInterpolatedAttribute(a,d,h,f,p,new dt)),l&&(x.uv1=qi.getInterpolatedAttribute(l,d,h,f,p,new dt)),c&&(x.normal=qi.getInterpolatedAttribute(c,d,h,f,p,new ne),x.normal.dot(r.direction)>0&&x.normal.multiplyScalar(-1));const v={a:d,b:h,c:f,normal:new ne,materialIndex:0};qi.getNormal(Tu,Cu,Ru,v.normal),x.face=v,x.barycoord=p}return x}class Wb extends Wn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Un,x=Un,p,v){super(null,c,d,h,f,x,a,l,p,v),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Hf=new ne,Xb=new ne,$b=new pt;class bs{constructor(e=new ne(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=Hf.subVectors(r,t).cross(Xb.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(Hf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||$b.getNormalMatrix(e),a=this.coplanarPoint(Hf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const la=new rc,qb=new dt(.5,.5),Lu=new ne;class Hm{constructor(e=new bs,t=new bs,r=new bs,a=new bs,l=new bs,c=new bs){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=mr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],x=l[4],p=l[5],v=l[6],_=l[7],E=l[8],w=l[9],M=l[10],S=l[11],A=l[12],L=l[13],C=l[14],I=l[15];if(a[0].setComponents(f-c,_-x,S-E,I-A).normalize(),a[1].setComponents(f+c,_+x,S+E,I+A).normalize(),a[2].setComponents(f+d,_+p,S+w,I+L).normalize(),a[3].setComponents(f-d,_-p,S-w,I-L).normalize(),r)a[4].setComponents(h,v,M,C).normalize(),a[5].setComponents(f-h,_-v,S-M,I-C).normalize();else if(a[4].setComponents(f-h,_-v,S-M,I-C).normalize(),t===mr)a[5].setComponents(f+h,_+v,S+M,I+C).normalize();else if(t===ql)a[5].setComponents(h,v,M,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),la.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),la.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(la)}intersectsSprite(e){la.center.set(0,0,0);const t=qb.distanceTo(e.center);return la.radius=.7071067811865476+t,la.applyMatrix4(e.matrixWorld),this.intersectsSphere(la)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Lu.x=a.normal.x>0?e.max.x:e.min.x,Lu.y=a.normal.y>0?e.max.y:e.min.y,Lu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Lu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Zu extends Sr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new vt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ud=new ne,dd=new ne,mv=new on,Dl=new Md,Du=new rc,Vf=new ne,gv=new ne;class Kb extends En{constructor(e=new Mi,t=new Zu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)ud.fromBufferAttribute(t,a-1),dd.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=ud.distanceTo(dd);e.setAttribute("lineDistance",new In(r,1))}else lt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Du.copy(r.boundingSphere),Du.applyMatrix4(a),Du.radius+=l,e.ray.intersectsSphere(Du)===!1)return;mv.copy(a).invert(),Dl.copy(e.ray).applyMatrix4(mv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,x=r.index,v=r.attributes.position;if(x!==null){const _=Math.max(0,c.start),E=Math.min(x.count,c.start+c.count);for(let w=_,M=E-1;w<M;w+=f){const S=x.getX(w),A=x.getX(w+1),L=Iu(this,e,Dl,h,S,A,w);L&&t.push(L)}if(this.isLineLoop){const w=x.getX(E-1),M=x.getX(_),S=Iu(this,e,Dl,h,w,M,E-1);S&&t.push(S)}}else{const _=Math.max(0,c.start),E=Math.min(v.count,c.start+c.count);for(let w=_,M=E-1;w<M;w+=f){const S=Iu(this,e,Dl,h,w,w+1,w);S&&t.push(S)}if(this.isLineLoop){const w=Iu(this,e,Dl,h,E-1,_,E-1);w&&t.push(w)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Iu(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(ud.fromBufferAttribute(d,a),dd.fromBufferAttribute(d,l),t.distanceSqToSegment(ud,dd,Vf,gv)>r)return;Vf.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Vf);if(!(f<e.near||f>e.far))return{distance:f,point:gv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const xv=new ne,vv=new ne;class _v extends Kb{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)xv.fromBufferAttribute(t,a),vv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+xv.distanceTo(vv);e.setAttribute("lineDistance",new In(r,1))}else lt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class zl extends Sr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new vt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const yv=new on,lm=new Md,Uu=new rc,Fu=new ne;class Gf extends En{constructor(e=new Mi,t=new zl){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Uu.copy(r.boundingSphere),Uu.applyMatrix4(a),Uu.radius+=l,e.ray.intersectsSphere(Uu)===!1)return;yv.copy(a).invert(),lm.copy(e.ray).applyMatrix4(yv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,p=r.attributes.position;if(f!==null){const v=Math.max(0,c.start),_=Math.min(f.count,c.start+c.count);for(let E=v,w=_;E<w;E++){const M=f.getX(E);Fu.fromBufferAttribute(p,M),Sv(Fu,M,h,a,e,t,this)}}else{const v=Math.max(0,c.start),_=Math.min(p.count,c.start+c.count);for(let E=v,w=_;E<w;E++)Fu.fromBufferAttribute(p,E),Sv(Fu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Sv(i,e,t,r,a,l,c){const d=lm.distanceSqToPoint(i);if(d<t){const h=new ne;lm.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class Ay extends Wn{constructor(e=[],t=ba,r,a,l,c,d,h,f,x){super(e,t,r,a,l,c,d,h,f,x),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Fo extends Wn{constructor(e,t,r=yr,a,l,c,d=Un,h=Un,f,x=Yr,p=1){if(x!==Yr&&x!==fa)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const v={width:e,height:t,depth:p};super(v,a,l,c,d,h,x,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Bm(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Yb extends Fo{constructor(e,t=yr,r=ba,a,l,c=Un,d=Un,h,f=Yr){const x={width:e,height:e,depth:1},p=[x,x,x,x,x,x];super(e,e,t,r,a,l,c,d,h,f),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Py extends Wn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class sc extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],x=[],p=[];let v=0,_=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new In(f,3)),this.setAttribute("normal",new In(x,3)),this.setAttribute("uv",new In(p,2));function E(w,M,S,A,L,C,I,N,U,b,D){const O=C/U,V=I/b,W=C/2,j=I/2,ue=N/2,q=U+1,pe=b+1;let J=0,K=0;const re=new ne;for(let he=0;he<pe;he++){const z=he*V-j;for(let ie=0;ie<q;ie++){const Ie=ie*O-W;re[w]=Ie*A,re[M]=z*L,re[S]=ue,f.push(re.x,re.y,re.z),re[w]=0,re[M]=0,re[S]=N>0?1:-1,x.push(re.x,re.y,re.z),p.push(ie/U),p.push(1-he/b),J+=1}}for(let he=0;he<b;he++)for(let z=0;z<U;z++){const ie=v+z+q*he,Ie=v+z+q*(he+1),je=v+(z+1)+q*(he+1),He=v+(z+1)+q*he;h.push(ie,Ie,He),h.push(Ie,je,He),K+=6}d.addGroup(_,K,D),_+=K,v+=J}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new sc(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Ed extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,x=h+1,p=e/d,v=t/h,_=[],E=[],w=[],M=[];for(let S=0;S<x;S++){const A=S*v-c;for(let L=0;L<f;L++){const C=L*p-l;E.push(C,-A,0),w.push(0,0,1),M.push(L/d),M.push(1-S/h)}}for(let S=0;S<h;S++)for(let A=0;A<d;A++){const L=A+f*S,C=A+f*(S+1),I=A+1+f*(S+1),N=A+1+f*S;_.push(L,C,N),_.push(C,I,N)}this.setIndex(_),this.setAttribute("position",new In(E,3)),this.setAttribute("normal",new In(w,3)),this.setAttribute("uv",new In(M,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ed(e.width,e.height,e.widthSegments,e.heightSegments)}}function ko(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(Mv(a))a.isRenderTargetTexture?(lt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(Mv(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Yn(i){const e={};for(let t=0;t<i.length;t++){const r=ko(i[t]);for(const a in r)e[a]=r[a]}return e}function Mv(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Qb(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ny(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ct.workingColorSpace}const Zb={clone:ko,merge:Yn};var Jb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,eT=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Mr extends Sr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Jb,this.fragmentShader=eT,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ko(e.uniforms),this.uniformsGroups=Qb(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new vt().setHex(a.value);break;case"v2":this.uniforms[r].value=new dt().fromArray(a.value);break;case"v3":this.uniforms[r].value=new ne().fromArray(a.value);break;case"v4":this.uniforms[r].value=new dn().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new on().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class tT extends Mr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class jf extends Sr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new vt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=od,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class nT extends Sr{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new vt(16777215),this.specular=new vt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new vt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=od,this.normalScale=new dt(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qr,this.combine=Pm,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class iT extends Sr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=hb,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class rT extends Sr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Hl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Ev(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Ev(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Ev(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class sT{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(x){d++,l===!1&&a.onStart!==void 0&&a.onStart(x,c,d),l=!0},this.itemEnd=function(x){c++,a.onProgress!==void 0&&a.onProgress(x,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(x){a.onError!==void 0&&a.onError(x)},this.resolveURL=function(x){return x=x.normalize("NFC"),h?h(x):x},this.setURLModifier=function(x){return h=x,this},this.addHandler=function(x,p){return f.push(x,p),this},this.removeHandler=function(x){const p=f.indexOf(x);return p!==-1&&f.splice(p,2),this},this.getHandler=function(x){for(let p=0,v=f.length;p<v;p+=2){const _=f[p],E=f[p+1];if(_.global&&(_.lastIndex=0),_.test(x))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const aT=new sT;class ac{constructor(e){this.manager=e!==void 0?e:aT,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}ac.DEFAULT_MATERIAL_NAME="__DEFAULT";const kr={};class oT extends Error{constructor(e,t){super(e),this.response=t}}class lT extends ac{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=Hl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(kr[e]!==void 0){kr[e].push({onLoad:t,onProgress:r,onError:a});return}kr[e]=[],kr[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&lt("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const x=kr[e],p=f.body.getReader(),v=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),_=v?parseInt(v):0,E=_!==0;let w=0;const M=new ReadableStream({start(S){A();function A(){p.read().then(({done:L,value:C})=>{if(L)S.close();else{w+=C.byteLength;const I=new ProgressEvent("progress",{lengthComputable:E,loaded:w,total:_});for(let N=0,U=x.length;N<U;N++){const b=x[N];b.onProgress&&b.onProgress(I)}S.enqueue(C),A()}},L=>{S.error(L)})}}});return new Response(M)}else throw new oT(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(x=>new DOMParser().parseFromString(x,d));case"json":return f.json();default:if(d==="")return f.text();{const p=/charset="?([^;"\s]*)"?/i.exec(d),v=p&&p[1]?p[1].toLowerCase():void 0,_=new TextDecoder(v);return f.arrayBuffer().then(E=>_.decode(E))}}}).then(f=>{Hl.add(`file:${e}`,f);const x=kr[e];delete kr[e];for(let p=0,v=x.length;p<v;p++){const _=x[p];_.onLoad&&_.onLoad(f)}}).catch(f=>{const x=kr[e];if(x===void 0)throw this.manager.itemError(e),f;delete kr[e];for(let p=0,v=x.length;p<v;p++){const _=x[p];_.onError&&_.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const co=new WeakMap;class cT extends ac{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=Hl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let p=co.get(c);p===void 0&&(p=[],co.set(c,p)),p.push({onLoad:t,onError:a})}return c}const d=Kl("img");function h(){x(),t&&t(this);const p=co.get(this)||[];for(let v=0;v<p.length;v++){const _=p[v];_.onLoad&&_.onLoad(this)}co.delete(this),l.manager.itemEnd(e)}function f(p){x(),a&&a(p),Hl.remove(`image:${e}`);const v=co.get(this)||[];for(let _=0;_<v.length;_++){const E=v[_];E.onError&&E.onError(p)}co.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function x(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),Hl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class uT extends ac{constructor(e){super(e)}load(e,t,r,a){const l=new Wn,c=new cT(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class Vm extends En{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new vt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class dT extends Vm{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.groundColor=new vt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Wf=new on,wv=new ne,bv=new ne;class hT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new dt(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new on,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Hm,this._frameExtents=new dt(1,1),this._viewportCount=1,this._viewports=[new dn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;wv.setFromMatrixPosition(e.matrixWorld),t.position.copy(wv),bv.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(bv),t.updateMatrixWorld(),Wf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Wf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===ql||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Wf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const ku=new ne,Ou=new zs,sr=new ne;class Ly extends En{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new on,this.projectionMatrix=new on,this.projectionMatrixInverse=new on,this.coordinateSystem=mr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(ku,Ou,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ku,Ou,sr.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(ku,Ou,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(ku,Ou,sr.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ms=new ne,Tv=new dt,Cv=new dt;class Ii extends Ly{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=om*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Qu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return om*2*Math.atan(Math.tan(Qu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){Ms.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ms.x,Ms.y).multiplyScalar(-e/Ms.z),Ms.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(Ms.x,Ms.y).multiplyScalar(-e/Ms.z)}getViewSize(e,t){return this.getViewBounds(e,Tv,Cv),t.subVectors(Cv,Tv)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Qu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Gm extends Ly{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,x=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=x*this.view.offsetY,h=d-x*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class fT extends hT{constructor(){super(new Gm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class Xf extends Vm{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(En.DEFAULT_UP),this.updateMatrix(),this.target=new En,this.shadow=new fT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class pT extends Vm{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const uo=-90,ho=1;class mT extends En{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(uo,ho,e,t);a.layers=this.layers,this.add(a);const l=new Ii(uo,ho,e,t);l.layers=this.layers,this.add(l);const c=new Ii(uo,ho,e,t);c.layers=this.layers,this.add(c);const d=new Ii(uo,ho,e,t);d.layers=this.layers,this.add(d);const h=new Ii(uo,ho,e,t);h.layers=this.layers,this.add(h);const f=new Ii(uo,ho,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===mr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===ql)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,x]=this.children,p=e.getRenderTarget(),v=e.getActiveCubeFace(),_=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const w=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let M=!1;e.isWebGLRenderer===!0?M=e.state.buffers.depth.getReversed():M=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=w,e.setRenderTarget(r,5,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,x),e.setRenderTarget(p,v,_),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class gT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Rv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=wt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(wt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Km=class Km{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};Km.prototype.isMatrix2=!0;let Av=Km;class xT extends Bs{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){lt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Pv(i,e,t,r){const a=vT(r);switch(t){case _y:return i*e;case Sy:return i*e/a.components*a.byteLength;case Um:return i*e/a.components*a.byteLength;case Ta:return i*e*2/a.components*a.byteLength;case Fm:return i*e*2/a.components*a.byteLength;case yy:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case km:return i*e*4/a.components*a.byteLength;case $u:case qu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ku:case Yu:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Lp:case Ip:return Math.max(i,16)*Math.max(e,8)/4;case Np:case Dp:return Math.max(i,8)*Math.max(e,8)/2;case Up:case Fp:case Op:case zp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case kp:case sd:case Bp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Hp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Vp:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Gp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case jp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Wp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Xp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case $p:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case qp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Kp:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Yp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Qp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Zp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Jp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case em:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case tm:case nm:case im:return Math.ceil(i/4)*Math.ceil(e/4)*16;case rm:case sm:return Math.ceil(i/4)*Math.ceil(e/4)*8;case ad:case am:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function vT(i){switch(i){case Si:case my:return{byteLength:1,components:1};case Xl:case gy:case Kr:return{byteLength:2,components:1};case Dm:case Im:return{byteLength:2,components:4};case yr:case Lm:case pr:return{byteLength:4,components:1};case xy:case vy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Am}}));typeof window<"u"&&(window.__THREE__?lt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Am);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Dy(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function _T(i){const e=new WeakMap;function t(d,h){const f=d.array,x=d.usage,p=f.byteLength,v=i.createBuffer();i.bindBuffer(h,v),i.bufferData(h,f,x),d.onUploadCallback();let _;if(f instanceof Float32Array)_=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)_=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?_=i.HALF_FLOAT:_=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)_=i.SHORT;else if(f instanceof Uint32Array)_=i.UNSIGNED_INT;else if(f instanceof Int32Array)_=i.INT;else if(f instanceof Int8Array)_=i.BYTE;else if(f instanceof Uint8Array)_=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)_=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:v,type:_,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:p}}function r(d,h,f){const x=h.array,p=h.updateRanges;if(i.bindBuffer(f,d),p.length===0)i.bufferSubData(f,0,x);else{p.sort((_,E)=>_.start-E.start);let v=0;for(let _=1;_<p.length;_++){const E=p[v],w=p[_];w.start<=E.start+E.count+1?E.count=Math.max(E.count,w.start+w.count-E.start):(++v,p[v]=w)}p.length=v+1;for(let _=0,E=p.length;_<E;_++){const w=p[_];i.bufferSubData(f,w.start*x.BYTES_PER_ELEMENT,x,w.start,w.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const x=e.get(d);(!x||x.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var yT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ST=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,MT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ET=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,wT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,bT=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,TT=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,CT=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,RT=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,AT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,PT=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,NT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,LT=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,DT=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,IT=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,UT=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,FT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,kT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,OT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,zT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,BT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,HT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,VT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,GT=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,jT=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,WT=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,XT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,$T=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,qT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,KT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,YT="gl_FragColor = linearToOutputTexel( gl_FragColor );",QT=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ZT=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,JT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,eC=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,tC=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,nC=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,iC=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,rC=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,sC=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,aC=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,oC=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lC=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,cC=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,uC=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,dC=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,hC=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,fC=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,pC=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,mC=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,gC=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,xC=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,vC=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,_C=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,yC=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,SC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,MC=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,EC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,wC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,bC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,TC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,CC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,RC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,AC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,PC=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,NC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,LC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,DC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,IC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,UC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,FC=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,kC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,OC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,zC=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,BC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,HC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,VC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,GC=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,jC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,WC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,XC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,$C=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,qC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,KC=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,YC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,QC=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ZC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,JC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,eR=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,tR=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,nR=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,iR=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,rR=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,sR=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,aR=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,oR=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,lR=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,cR=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,uR=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,dR=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,hR=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,fR=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,pR=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,mR=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,gR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,xR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,vR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,_R=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const yR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,SR=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,MR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ER=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,wR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,bR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,TR=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,CR=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,RR=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,AR=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,PR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,NR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,LR=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,DR=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,IR=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,UR=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,FR=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,kR=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,OR=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,zR=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,BR=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,HR=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,VR=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,GR=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jR=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,WR=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,XR=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,$R=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,qR=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,KR=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,YR=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,QR=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ZR=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,JR=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,_t={alphahash_fragment:yT,alphahash_pars_fragment:ST,alphamap_fragment:MT,alphamap_pars_fragment:ET,alphatest_fragment:wT,alphatest_pars_fragment:bT,aomap_fragment:TT,aomap_pars_fragment:CT,batching_pars_vertex:RT,batching_vertex:AT,begin_vertex:PT,beginnormal_vertex:NT,bsdfs:LT,iridescence_fragment:DT,bumpmap_pars_fragment:IT,clipping_planes_fragment:UT,clipping_planes_pars_fragment:FT,clipping_planes_pars_vertex:kT,clipping_planes_vertex:OT,color_fragment:zT,color_pars_fragment:BT,color_pars_vertex:HT,color_vertex:VT,common:GT,cube_uv_reflection_fragment:jT,defaultnormal_vertex:WT,displacementmap_pars_vertex:XT,displacementmap_vertex:$T,emissivemap_fragment:qT,emissivemap_pars_fragment:KT,colorspace_fragment:YT,colorspace_pars_fragment:QT,envmap_fragment:ZT,envmap_common_pars_fragment:JT,envmap_pars_fragment:eC,envmap_pars_vertex:tC,envmap_physical_pars_fragment:hC,envmap_vertex:nC,fog_vertex:iC,fog_pars_vertex:rC,fog_fragment:sC,fog_pars_fragment:aC,gradientmap_pars_fragment:oC,lightmap_pars_fragment:lC,lights_lambert_fragment:cC,lights_lambert_pars_fragment:uC,lights_pars_begin:dC,lights_toon_fragment:fC,lights_toon_pars_fragment:pC,lights_phong_fragment:mC,lights_phong_pars_fragment:gC,lights_physical_fragment:xC,lights_physical_pars_fragment:vC,lights_fragment_begin:_C,lights_fragment_maps:yC,lights_fragment_end:SC,lightprobes_pars_fragment:MC,logdepthbuf_fragment:EC,logdepthbuf_pars_fragment:wC,logdepthbuf_pars_vertex:bC,logdepthbuf_vertex:TC,map_fragment:CC,map_pars_fragment:RC,map_particle_fragment:AC,map_particle_pars_fragment:PC,metalnessmap_fragment:NC,metalnessmap_pars_fragment:LC,morphinstance_vertex:DC,morphcolor_vertex:IC,morphnormal_vertex:UC,morphtarget_pars_vertex:FC,morphtarget_vertex:kC,normal_fragment_begin:OC,normal_fragment_maps:zC,normal_pars_fragment:BC,normal_pars_vertex:HC,normal_vertex:VC,normalmap_pars_fragment:GC,clearcoat_normal_fragment_begin:jC,clearcoat_normal_fragment_maps:WC,clearcoat_pars_fragment:XC,iridescence_pars_fragment:$C,opaque_fragment:qC,packing:KC,premultiplied_alpha_fragment:YC,project_vertex:QC,dithering_fragment:ZC,dithering_pars_fragment:JC,roughnessmap_fragment:eR,roughnessmap_pars_fragment:tR,shadowmap_pars_fragment:nR,shadowmap_pars_vertex:iR,shadowmap_vertex:rR,shadowmask_pars_fragment:sR,skinbase_vertex:aR,skinning_pars_vertex:oR,skinning_vertex:lR,skinnormal_vertex:cR,specularmap_fragment:uR,specularmap_pars_fragment:dR,tonemapping_fragment:hR,tonemapping_pars_fragment:fR,transmission_fragment:pR,transmission_pars_fragment:mR,uv_pars_fragment:gR,uv_pars_vertex:xR,uv_vertex:vR,worldpos_vertex:_R,background_vert:yR,background_frag:SR,backgroundCube_vert:MR,backgroundCube_frag:ER,cube_vert:wR,cube_frag:bR,depth_vert:TR,depth_frag:CR,distance_vert:RR,distance_frag:AR,equirect_vert:PR,equirect_frag:NR,linedashed_vert:LR,linedashed_frag:DR,meshbasic_vert:IR,meshbasic_frag:UR,meshlambert_vert:FR,meshlambert_frag:kR,meshmatcap_vert:OR,meshmatcap_frag:zR,meshnormal_vert:BR,meshnormal_frag:HR,meshphong_vert:VR,meshphong_frag:GR,meshphysical_vert:jR,meshphysical_frag:WR,meshtoon_vert:XR,meshtoon_frag:$R,points_vert:qR,points_frag:KR,shadow_vert:YR,shadow_frag:QR,sprite_vert:ZR,sprite_frag:JR},ze={common:{diffuse:{value:new vt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new dt(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new vt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new ne},probesMax:{value:new ne},probesResolution:{value:new ne}},points:{diffuse:{value:new vt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new vt(16777215)},opacity:{value:1},center:{value:new dt(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},ur={basic:{uniforms:Yn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.fog]),vertexShader:_t.meshbasic_vert,fragmentShader:_t.meshbasic_frag},lambert:{uniforms:Yn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,ze.lights,{emissive:{value:new vt(0)},envMapIntensity:{value:1}}]),vertexShader:_t.meshlambert_vert,fragmentShader:_t.meshlambert_frag},phong:{uniforms:Yn([ze.common,ze.specularmap,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,ze.lights,{emissive:{value:new vt(0)},specular:{value:new vt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:_t.meshphong_vert,fragmentShader:_t.meshphong_frag},standard:{uniforms:Yn([ze.common,ze.envmap,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.roughnessmap,ze.metalnessmap,ze.fog,ze.lights,{emissive:{value:new vt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag},toon:{uniforms:Yn([ze.common,ze.aomap,ze.lightmap,ze.emissivemap,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.gradientmap,ze.fog,ze.lights,{emissive:{value:new vt(0)}}]),vertexShader:_t.meshtoon_vert,fragmentShader:_t.meshtoon_frag},matcap:{uniforms:Yn([ze.common,ze.bumpmap,ze.normalmap,ze.displacementmap,ze.fog,{matcap:{value:null}}]),vertexShader:_t.meshmatcap_vert,fragmentShader:_t.meshmatcap_frag},points:{uniforms:Yn([ze.points,ze.fog]),vertexShader:_t.points_vert,fragmentShader:_t.points_frag},dashed:{uniforms:Yn([ze.common,ze.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:_t.linedashed_vert,fragmentShader:_t.linedashed_frag},depth:{uniforms:Yn([ze.common,ze.displacementmap]),vertexShader:_t.depth_vert,fragmentShader:_t.depth_frag},normal:{uniforms:Yn([ze.common,ze.bumpmap,ze.normalmap,ze.displacementmap,{opacity:{value:1}}]),vertexShader:_t.meshnormal_vert,fragmentShader:_t.meshnormal_frag},sprite:{uniforms:Yn([ze.sprite,ze.fog]),vertexShader:_t.sprite_vert,fragmentShader:_t.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:_t.background_vert,fragmentShader:_t.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:_t.backgroundCube_vert,fragmentShader:_t.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:_t.cube_vert,fragmentShader:_t.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:_t.equirect_vert,fragmentShader:_t.equirect_frag},distance:{uniforms:Yn([ze.common,ze.displacementmap,{referencePosition:{value:new ne},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:_t.distance_vert,fragmentShader:_t.distance_frag},shadow:{uniforms:Yn([ze.lights,ze.fog,{color:{value:new vt(0)},opacity:{value:1}}]),vertexShader:_t.shadow_vert,fragmentShader:_t.shadow_frag}};ur.physical={uniforms:Yn([ur.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new dt(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new vt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new dt},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new vt(0)},specularColor:{value:new vt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new dt},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:_t.meshphysical_vert,fragmentShader:_t.meshphysical_frag};const zu={r:0,b:0,g:0},eA=new on,Iy=new pt;Iy.set(-1,0,0,0,1,0,0,0,1);function tA(i,e,t,r,a,l){const c=new vt(0);let d=a===!0?0:1,h,f,x=null,p=0,v=null;function _(A){let L=A.isScene===!0?A.background:null;if(L&&L.isTexture){const C=A.backgroundBlurriness>0;L=e.get(L,C)}return L}function E(A){let L=!1;const C=_(A);C===null?M(c,d):C&&C.isColor&&(M(C,1),L=!0);const I=i.xr.getEnvironmentBlendMode();I==="additive"?t.buffers.color.setClear(0,0,0,1,l):I==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||L)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function w(A,L){const C=_(L);C&&(C.isCubeTexture||C.mapping===Sd)?(f===void 0&&(f=new Qi(new sc(1,1,1),new Mr({name:"BackgroundCubeMaterial",uniforms:ko(ur.backgroundCube.uniforms),vertexShader:ur.backgroundCube.vertexShader,fragmentShader:ur.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(I,N,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(eA.makeRotationFromEuler(L.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Iy),f.material.toneMapped=Ct.getTransfer(C.colorSpace)!==Gt,(x!==C||p!==C.version||v!==i.toneMapping)&&(f.material.needsUpdate=!0,x=C,p=C.version,v=i.toneMapping),f.layers.enableAll(),A.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(h===void 0&&(h=new Qi(new Ed(2,2),new Mr({name:"BackgroundMaterial",uniforms:ko(ur.background.uniforms),vertexShader:ur.background.vertexShader,fragmentShader:ur.background.fragmentShader,side:Os,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=C,h.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,h.material.toneMapped=Ct.getTransfer(C.colorSpace)!==Gt,C.matrixAutoUpdate===!0&&C.updateMatrix(),h.material.uniforms.uvTransform.value.copy(C.matrix),(x!==C||p!==C.version||v!==i.toneMapping)&&(h.material.needsUpdate=!0,x=C,p=C.version,v=i.toneMapping),h.layers.enableAll(),A.unshift(h,h.geometry,h.material,0,0,null))}function M(A,L){A.getRGB(zu,Ny(i)),t.buffers.color.setClear(zu.r,zu.g,zu.b,L,l)}function S(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(A,L=1){c.set(A),d=L,M(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(A){d=A,M(c,d)},render:E,addToRenderList:w,dispose:S}}function nA(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=v(null);let l=a,c=!1;function d(V,W,j,ue,q){let pe=!1;const J=p(V,ue,j,W);l!==J&&(l=J,f(l.object)),pe=_(V,ue,j,q),pe&&E(V,ue,j,q),q!==null&&e.update(q,i.ELEMENT_ARRAY_BUFFER),(pe||c)&&(c=!1,C(V,W,j,ue),q!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(q).buffer))}function h(){return i.createVertexArray()}function f(V){return i.bindVertexArray(V)}function x(V){return i.deleteVertexArray(V)}function p(V,W,j,ue){const q=ue.wireframe===!0;let pe=r[W.id];pe===void 0&&(pe={},r[W.id]=pe);const J=V.isInstancedMesh===!0?V.id:0;let K=pe[J];K===void 0&&(K={},pe[J]=K);let re=K[j.id];re===void 0&&(re={},K[j.id]=re);let he=re[q];return he===void 0&&(he=v(h()),re[q]=he),he}function v(V){const W=[],j=[],ue=[];for(let q=0;q<t;q++)W[q]=0,j[q]=0,ue[q]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:W,enabledAttributes:j,attributeDivisors:ue,object:V,attributes:{},index:null}}function _(V,W,j,ue){const q=l.attributes,pe=W.attributes;let J=0;const K=j.getAttributes();for(const re in K)if(K[re].location>=0){const z=q[re];let ie=pe[re];if(ie===void 0&&(re==="instanceMatrix"&&V.instanceMatrix&&(ie=V.instanceMatrix),re==="instanceColor"&&V.instanceColor&&(ie=V.instanceColor)),z===void 0||z.attribute!==ie||ie&&z.data!==ie.data)return!0;J++}return l.attributesNum!==J||l.index!==ue}function E(V,W,j,ue){const q={},pe=W.attributes;let J=0;const K=j.getAttributes();for(const re in K)if(K[re].location>=0){let z=pe[re];z===void 0&&(re==="instanceMatrix"&&V.instanceMatrix&&(z=V.instanceMatrix),re==="instanceColor"&&V.instanceColor&&(z=V.instanceColor));const ie={};ie.attribute=z,z&&z.data&&(ie.data=z.data),q[re]=ie,J++}l.attributes=q,l.attributesNum=J,l.index=ue}function w(){const V=l.newAttributes;for(let W=0,j=V.length;W<j;W++)V[W]=0}function M(V){S(V,0)}function S(V,W){const j=l.newAttributes,ue=l.enabledAttributes,q=l.attributeDivisors;j[V]=1,ue[V]===0&&(i.enableVertexAttribArray(V),ue[V]=1),q[V]!==W&&(i.vertexAttribDivisor(V,W),q[V]=W)}function A(){const V=l.newAttributes,W=l.enabledAttributes;for(let j=0,ue=W.length;j<ue;j++)W[j]!==V[j]&&(i.disableVertexAttribArray(j),W[j]=0)}function L(V,W,j,ue,q,pe,J){J===!0?i.vertexAttribIPointer(V,W,j,q,pe):i.vertexAttribPointer(V,W,j,ue,q,pe)}function C(V,W,j,ue){w();const q=ue.attributes,pe=j.getAttributes(),J=W.defaultAttributeValues;for(const K in pe){const re=pe[K];if(re.location>=0){let he=q[K];if(he===void 0&&(K==="instanceMatrix"&&V.instanceMatrix&&(he=V.instanceMatrix),K==="instanceColor"&&V.instanceColor&&(he=V.instanceColor)),he!==void 0){const z=he.normalized,ie=he.itemSize,Ie=e.get(he);if(Ie===void 0)continue;const je=Ie.buffer,He=Ie.type,H=Ie.bytesPerElement,ve=He===i.INT||He===i.UNSIGNED_INT||he.gpuType===Lm;if(he.isInterleavedBufferAttribute){const fe=he.data,te=fe.stride,Fe=he.offset;if(fe.isInstancedInterleavedBuffer){for(let Xe=0;Xe<re.locationSize;Xe++)S(re.location+Xe,fe.meshPerAttribute);V.isInstancedMesh!==!0&&ue._maxInstanceCount===void 0&&(ue._maxInstanceCount=fe.meshPerAttribute*fe.count)}else for(let Xe=0;Xe<re.locationSize;Xe++)M(re.location+Xe);i.bindBuffer(i.ARRAY_BUFFER,je);for(let Xe=0;Xe<re.locationSize;Xe++)L(re.location+Xe,ie/re.locationSize,He,z,te*H,(Fe+ie/re.locationSize*Xe)*H,ve)}else{if(he.isInstancedBufferAttribute){for(let fe=0;fe<re.locationSize;fe++)S(re.location+fe,he.meshPerAttribute);V.isInstancedMesh!==!0&&ue._maxInstanceCount===void 0&&(ue._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let fe=0;fe<re.locationSize;fe++)M(re.location+fe);i.bindBuffer(i.ARRAY_BUFFER,je);for(let fe=0;fe<re.locationSize;fe++)L(re.location+fe,ie/re.locationSize,He,z,ie*H,ie/re.locationSize*fe*H,ve)}}else if(J!==void 0){const z=J[K];if(z!==void 0)switch(z.length){case 2:i.vertexAttrib2fv(re.location,z);break;case 3:i.vertexAttrib3fv(re.location,z);break;case 4:i.vertexAttrib4fv(re.location,z);break;default:i.vertexAttrib1fv(re.location,z)}}}}A()}function I(){D();for(const V in r){const W=r[V];for(const j in W){const ue=W[j];for(const q in ue){const pe=ue[q];for(const J in pe)x(pe[J].object),delete pe[J];delete ue[q]}}delete r[V]}}function N(V){if(r[V.id]===void 0)return;const W=r[V.id];for(const j in W){const ue=W[j];for(const q in ue){const pe=ue[q];for(const J in pe)x(pe[J].object),delete pe[J];delete ue[q]}}delete r[V.id]}function U(V){for(const W in r){const j=r[W];for(const ue in j){const q=j[ue];if(q[V.id]===void 0)continue;const pe=q[V.id];for(const J in pe)x(pe[J].object),delete pe[J];delete q[V.id]}}}function b(V){for(const W in r){const j=r[W],ue=V.isInstancedMesh===!0?V.id:0,q=j[ue];if(q!==void 0){for(const pe in q){const J=q[pe];for(const K in J)x(J[K].object),delete J[K];delete q[pe]}delete j[ue],Object.keys(j).length===0&&delete r[W]}}}function D(){O(),c=!0,l!==a&&(l=a,f(l.object))}function O(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:D,resetDefaultState:O,dispose:I,releaseStatesOfGeometry:N,releaseStatesOfObject:b,releaseStatesOfProgram:U,initAttributes:w,enableAttribute:M,disableUnusedAttributes:A}}function iA(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,x){x!==0&&(i.drawArraysInstanced(r,h,f,x),t.update(f,r,x))}function d(h,f,x){if(x===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,x);let v=0;for(let _=0;_<x;_++)v+=f[_];t.update(v,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function rA(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const U=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(U.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(U){return!(U!==Ki&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(U){const b=U===Kr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(U!==Si&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&U!==pr&&!b)}function h(U){if(U==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";U="mediump"}return U==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const x=h(f);x!==f&&(lt("WebGLRenderer:",f,"not supported, using",x,"instead."),f=x);const p=t.logarithmicDepthBuffer===!0,v=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&v===!1&&lt("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const _=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),w=i.getParameter(i.MAX_TEXTURE_SIZE),M=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),S=i.getParameter(i.MAX_VERTEX_ATTRIBS),A=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),L=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),I=i.getParameter(i.MAX_SAMPLES),N=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:p,reversedDepthBuffer:v,maxTextures:_,maxVertexTextures:E,maxTextureSize:w,maxCubemapSize:M,maxAttributes:S,maxVertexUniforms:A,maxVaryings:L,maxFragmentUniforms:C,maxSamples:I,samples:N}}function sA(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new bs,d=new pt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(p,v){const _=p.length!==0||v||r!==0||a;return a=v,r=p.length,_},this.beginShadows=function(){l=!0,x(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(p,v){t=x(p,v,0)},this.setState=function(p,v,_){const E=p.clippingPlanes,w=p.clipIntersection,M=p.clipShadows,S=i.get(p);if(!a||E===null||E.length===0||l&&!M)l?x(null):f();else{const A=l?0:r,L=A*4;let C=S.clippingState||null;h.value=C,C=x(E,v,L,_);for(let I=0;I!==L;++I)C[I]=t[I];S.clippingState=C,this.numIntersection=w?this.numPlanes:0,this.numPlanes+=A}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function x(p,v,_,E){const w=p!==null?p.length:0;let M=null;if(w!==0){if(M=h.value,E!==!0||M===null){const S=_+w*4,A=v.matrixWorldInverse;d.getNormalMatrix(A),(M===null||M.length<S)&&(M=new Float32Array(S));for(let L=0,C=_;L!==w;++L,C+=4)c.copy(p[L]).applyMatrix4(A,d),c.normal.toArray(M,C),M[C+3]=c.constant}h.value=M,h.needsUpdate=!0}return e.numPlanes=w,e.numIntersection=0,M}}const Fs=4,Nv=[.125,.215,.35,.446,.526,.582],ua=20,aA=256,Il=new Gm,Lv=new vt;let $f=null,qf=0,Kf=0,Yf=!1;const oA=new ne;class Dv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=oA}=l;$f=this._renderer.getRenderTarget(),qf=this._renderer.getActiveCubeFace(),Kf=this._renderer.getActiveMipmapLevel(),Yf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Fv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Uv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget($f,qf,Kf),this._renderer.xr.enabled=Yf,e.scissorTest=!1,fo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ba||e.mapping===Uo?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),$f=this._renderer.getRenderTarget(),qf=this._renderer.getActiveCubeFace(),Kf=this._renderer.getActiveMipmapLevel(),Yf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:jn,minFilter:jn,generateMipmaps:!1,type:Kr,format:Ki,colorSpace:ld,depthBuffer:!1},a=Iv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Iv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=lA(l)),this._blurMaterial=uA(l,e,t),this._ggxMaterial=cA(l,e,t)}return a}_compileMaterial(e){const t=new Qi(new Mi,e);this._renderer.compile(t,Il)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],x=[1,1,1,-1,-1,-1],p=this._renderer,v=p.autoClear,_=p.toneMapping;p.getClearColor(Lv),p.toneMapping=xr,p.autoClear=!1,p.state.buffers.depth.getReversed()&&(p.setRenderTarget(a),p.clearDepth(),p.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Qi(new sc,new Ry({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const w=this._backgroundBox,M=w.material;let S=!1;const A=e.background;A?A.isColor&&(M.color.copy(A),e.background=null,S=!0):(M.color.copy(Lv),S=!0);for(let L=0;L<6;L++){const C=L%3;C===0?(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+x[L],l.y,l.z)):C===1?(h.up.set(0,0,f[L]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+x[L],l.z)):(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+x[L]));const I=this._cubeSize;fo(a,C*I,L>2?I:0,I,I),p.setRenderTarget(a),S&&p.render(w,h),p.render(e,h)}p.toneMapping=_,p.autoClear=v,e.background=A}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===ba||e.mapping===Uo;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Fv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Uv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;fo(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Il)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),x=t/(this._lodMeshes.length-1),p=Math.sqrt(f*f-x*x),v=0+f*1.25,_=p*v,{_lodMax:E}=this,w=this._sizeLods[r],M=3*w*(r>E-Fs?r-E+Fs:0),S=4*(this._cubeSize-w);h.envMap.value=e.texture,h.roughness.value=_,h.mipInt.value=E-t,fo(l,M,S,3*w,2*w),a.setRenderTarget(l),a.render(d,Il),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,fo(e,M,S,3*w,2*w),a.setRenderTarget(e),a.render(d,Il)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Dt("blur direction must be either latitudinal or longitudinal!");const x=3,p=this._lodMeshes[a];p.material=f;const v=f.uniforms,_=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*_):2*Math.PI/(2*ua-1),w=l/E,M=isFinite(l)?1+Math.floor(x*w):ua;M>ua&&lt(`sigmaRadians, ${l}, is too large and will clip, as it requested ${M} samples when the maximum is set to ${ua}`);const S=[];let A=0;for(let U=0;U<ua;++U){const b=U/w,D=Math.exp(-b*b/2);S.push(D),U===0?A+=D:U<M&&(A+=2*D)}for(let U=0;U<S.length;U++)S[U]=S[U]/A;v.envMap.value=e.texture,v.samples.value=M,v.weights.value=S,v.latitudinal.value=c==="latitudinal",d&&(v.poleAxis.value=d);const{_lodMax:L}=this;v.dTheta.value=E,v.mipInt.value=L-r;const C=this._sizeLods[a],I=3*C*(a>L-Fs?a-L+Fs:0),N=4*(this._cubeSize-C);fo(t,I,N,3*C,2*C),h.setRenderTarget(t),h.render(p,Il)}}function lA(i){const e=[],t=[],r=[];let a=i;const l=i-Fs+1+Nv.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Fs?h=Nv[c-i+Fs-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),x=-f,p=1+f,v=[x,x,p,x,p,p,x,x,p,p,x,p],_=6,E=6,w=3,M=2,S=1,A=new Float32Array(w*E*_),L=new Float32Array(M*E*_),C=new Float32Array(S*E*_);for(let N=0;N<_;N++){const U=N%3*2/3-1,b=N>2?0:-1,D=[U,b,0,U+2/3,b,0,U+2/3,b+1,0,U,b,0,U+2/3,b+1,0,U,b+1,0];A.set(D,w*E*N),L.set(v,M*E*N);const O=[N,N,N,N,N,N];C.set(O,S*E*N)}const I=new Mi;I.setAttribute("position",new _r(A,w)),I.setAttribute("uv",new _r(L,M)),I.setAttribute("faceIndex",new _r(C,S)),r.push(new Qi(I,null)),a>Fs&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Iv(i,e,t){const r=new vr(i,e,t);return r.texture.mapping=Sd,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function fo(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function cA(i,e,t){return new Mr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:aA,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:wd(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function uA(i,e,t){const r=new Float32Array(ua),a=new ne(0,1,0);return new Mr({name:"SphericalGaussianBlur",defines:{n:ua,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:wd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function Uv(){return new Mr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:wd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function Fv(){return new Mr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:wd(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function wd(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class Uy extends vr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new Ay(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},a=new sc(5,5,5),l=new Mr({name:"CubemapFromEquirect",uniforms:ko(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:Wr});l.uniforms.tEquirect.value=t;const c=new Qi(a,l),d=t.minFilter;return t.minFilter===ha&&(t.minFilter=jn),new mT(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function dA(i){let e=new WeakMap,t=new WeakMap,r=null;function a(v,_=!1){return v==null?null:_?c(v):l(v)}function l(v){if(v&&v.isTexture){const _=v.mapping;if(_===gf||_===xf)if(e.has(v)){const E=e.get(v).texture;return d(E,v.mapping)}else{const E=v.image;if(E&&E.height>0){const w=new Uy(E.height);return w.fromEquirectangularTexture(i,v),e.set(v,w),v.addEventListener("dispose",f),d(w.texture,v.mapping)}else return null}}return v}function c(v){if(v&&v.isTexture){const _=v.mapping,E=_===gf||_===xf,w=_===ba||_===Uo;if(E||w){let M=t.get(v);const S=M!==void 0?M.texture.pmremVersion:0;if(v.isRenderTargetTexture&&v.pmremVersion!==S)return r===null&&(r=new Dv(i)),M=E?r.fromEquirectangular(v,M):r.fromCubemap(v,M),M.texture.pmremVersion=v.pmremVersion,t.set(v,M),M.texture;if(M!==void 0)return M.texture;{const A=v.image;return E&&A&&A.height>0||w&&A&&h(A)?(r===null&&(r=new Dv(i)),M=E?r.fromEquirectangular(v):r.fromCubemap(v),M.texture.pmremVersion=v.pmremVersion,t.set(v,M),v.addEventListener("dispose",x),M.texture):null}}}return v}function d(v,_){return _===gf?v.mapping=ba:_===xf&&(v.mapping=Uo),v}function h(v){let _=0;const E=6;for(let w=0;w<E;w++)v[w]!==void 0&&_++;return _===E}function f(v){const _=v.target;_.removeEventListener("dispose",f);const E=e.get(_);E!==void 0&&(e.delete(_),E.dispose())}function x(v){const _=v.target;_.removeEventListener("dispose",x);const E=t.get(_);E!==void 0&&(t.delete(_),E.dispose())}function p(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:p}}function hA(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&_o("WebGLRenderer: "+r+" extension not supported."),a}}}function fA(i,e,t,r){const a={},l=new WeakMap;function c(p){const v=p.target;v.index!==null&&e.remove(v.index);for(const E in v.attributes)e.remove(v.attributes[E]);v.removeEventListener("dispose",c),delete a[v.id];const _=l.get(v);_&&(e.remove(_),l.delete(v)),r.releaseStatesOfGeometry(v),v.isInstancedBufferGeometry===!0&&delete v._maxInstanceCount,t.memory.geometries--}function d(p,v){return a[v.id]===!0||(v.addEventListener("dispose",c),a[v.id]=!0,t.memory.geometries++),v}function h(p){const v=p.attributes;for(const _ in v)e.update(v[_],i.ARRAY_BUFFER)}function f(p){const v=[],_=p.index,E=p.attributes.position;let w=0;if(E===void 0)return;if(_!==null){const A=_.array;w=_.version;for(let L=0,C=A.length;L<C;L+=3){const I=A[L+0],N=A[L+1],U=A[L+2];v.push(I,N,N,U,U,I)}}else{const A=E.array;w=E.version;for(let L=0,C=A.length/3-1;L<C;L+=3){const I=L+0,N=L+1,U=L+2;v.push(I,N,N,U,U,I)}}const M=new(E.count>=65535?Cy:Ty)(v,1);M.version=w;const S=l.get(p);S&&e.remove(S),l.set(p,M)}function x(p){const v=l.get(p);if(v){const _=p.index;_!==null&&v.version<_.version&&f(p)}else f(p);return l.get(p)}return{get:d,update:h,getWireframeAttribute:x}}function pA(i,e,t){let r;function a(p){r=p}let l,c;function d(p){l=p.type,c=p.bytesPerElement}function h(p,v){i.drawElements(r,v,l,p*c),t.update(v,r,1)}function f(p,v,_){_!==0&&(i.drawElementsInstanced(r,v,l,p*c,_),t.update(v,r,_))}function x(p,v,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,v,0,l,p,0,_);let w=0;for(let M=0;M<_;M++)w+=v[M];t.update(w,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=x}function mA(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Dt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function gA(i,e,t){const r=new WeakMap,a=new dn;function l(c,d,h){const f=c.morphTargetInfluences,x=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,p=x!==void 0?x.length:0;let v=r.get(d);if(v===void 0||v.count!==p){let O=function(){b.dispose(),r.delete(d),d.removeEventListener("dispose",O)};var _=O;v!==void 0&&v.texture.dispose();const E=d.morphAttributes.position!==void 0,w=d.morphAttributes.normal!==void 0,M=d.morphAttributes.color!==void 0,S=d.morphAttributes.position||[],A=d.morphAttributes.normal||[],L=d.morphAttributes.color||[];let C=0;E===!0&&(C=1),w===!0&&(C=2),M===!0&&(C=3);let I=d.attributes.position.count*C,N=1;I>e.maxTextureSize&&(N=Math.ceil(I/e.maxTextureSize),I=e.maxTextureSize);const U=new Float32Array(I*N*4*p),b=new Ey(U,I,N,p);b.type=pr,b.needsUpdate=!0;const D=C*4;for(let V=0;V<p;V++){const W=S[V],j=A[V],ue=L[V],q=I*N*4*V;for(let pe=0;pe<W.count;pe++){const J=pe*D;E===!0&&(a.fromBufferAttribute(W,pe),U[q+J+0]=a.x,U[q+J+1]=a.y,U[q+J+2]=a.z,U[q+J+3]=0),w===!0&&(a.fromBufferAttribute(j,pe),U[q+J+4]=a.x,U[q+J+5]=a.y,U[q+J+6]=a.z,U[q+J+7]=0),M===!0&&(a.fromBufferAttribute(ue,pe),U[q+J+8]=a.x,U[q+J+9]=a.y,U[q+J+10]=a.z,U[q+J+11]=ue.itemSize===4?a.w:1)}}v={count:p,texture:b,size:new dt(I,N)},r.set(d,v),d.addEventListener("dispose",O)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let M=0;M<f.length;M++)E+=f[M];const w=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",w),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",v.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",v.size)}return{update:l}}function xA(i,e,t,r,a){let l=new WeakMap;function c(f){const x=a.render.frame,p=f.geometry,v=e.get(f,p);if(l.get(v)!==x&&(e.update(v),l.set(v,x)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==x&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,x))),f.isSkinnedMesh){const _=f.skeleton;l.get(_)!==x&&(_.update(),l.set(_,x))}return v}function d(){l=new WeakMap}function h(f){const x=f.target;x.removeEventListener("dispose",h),r.releaseStatesOfObject(x),t.remove(x.instanceMatrix),x.instanceColor!==null&&t.remove(x.instanceColor)}return{update:c,dispose:d}}const vA={[ly]:"LINEAR_TONE_MAPPING",[cy]:"REINHARD_TONE_MAPPING",[uy]:"CINEON_TONE_MAPPING",[Nm]:"ACES_FILMIC_TONE_MAPPING",[hy]:"AGX_TONE_MAPPING",[fy]:"NEUTRAL_TONE_MAPPING",[dy]:"CUSTOM_TONE_MAPPING"};function _A(i,e,t,r,a,l){const c=new vr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Fo(e,t):void 0}),d=new vr(e,t,{type:Kr,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new In([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new In([0,2,0,0,2,0],2));const f=new tT({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),x=new Qi(h,f),p=new Gm(-1,1,1,-1,0,1);let v=null,_=null,E=!1,w,M=null,S=[],A=!1;this.setSize=function(L,C){c.setSize(L,C),d.setSize(L,C);for(let I=0;I<S.length;I++){const N=S[I];N.setSize&&N.setSize(L,C)}},this.setEffects=function(L){S=L,A=S.length>0&&S[0].isRenderPass===!0;const C=c.width,I=c.height;for(let N=0;N<S.length;N++){const U=S[N];U.setSize&&U.setSize(C,I)}},this.begin=function(L,C){if(E||L.toneMapping===xr&&S.length===0)return!1;if(M=C,C!==null){const I=C.width,N=C.height;(c.width!==I||c.height!==N)&&this.setSize(I,N)}return A===!1&&L.setRenderTarget(c),w=L.toneMapping,L.toneMapping=xr,!0},this.hasRenderPass=function(){return A},this.end=function(L,C){L.toneMapping=w,E=!0;let I=c,N=d;for(let U=0;U<S.length;U++){const b=S[U];if(b.enabled!==!1&&(b.render(L,N,I,C),b.needsSwap!==!1)){const D=I;I=N,N=D}}if(v!==L.outputColorSpace||_!==L.toneMapping){v=L.outputColorSpace,_=L.toneMapping,f.defines={},Ct.getTransfer(v)===Gt&&(f.defines.SRGB_TRANSFER="");const U=vA[_];U&&(f.defines[U]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=I.texture,L.setRenderTarget(M),L.render(x,p),M=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const Fy=new Wn,cm=new Fo(1,1),ky=new Ey,Oy=new Nb,zy=new Ay,kv=[],Ov=[],zv=new Float32Array(16),Bv=new Float32Array(9),Hv=new Float32Array(4);function jo(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=kv[a];if(l===void 0&&(l=new Float32Array(a),kv[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function wn(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function bn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function bd(i,e){let t=Ov[e];t===void 0&&(t=new Int32Array(e),Ov[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function yA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function SA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2fv(this.addr,e),bn(t,e)}}function MA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(wn(t,e))return;i.uniform3fv(this.addr,e),bn(t,e)}}function EA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4fv(this.addr,e),bn(t,e)}}function wA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;Hv.set(r),i.uniformMatrix2fv(this.addr,!1,Hv),bn(t,r)}}function bA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;Bv.set(r),i.uniformMatrix3fv(this.addr,!1,Bv),bn(t,r)}}function TA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(wn(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),bn(t,e)}else{if(wn(t,r))return;zv.set(r),i.uniformMatrix4fv(this.addr,!1,zv),bn(t,r)}}function CA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function RA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2iv(this.addr,e),bn(t,e)}}function AA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3iv(this.addr,e),bn(t,e)}}function PA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4iv(this.addr,e),bn(t,e)}}function NA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function LA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(wn(t,e))return;i.uniform2uiv(this.addr,e),bn(t,e)}}function DA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(wn(t,e))return;i.uniform3uiv(this.addr,e),bn(t,e)}}function IA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(wn(t,e))return;i.uniform4uiv(this.addr,e),bn(t,e)}}function UA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(cm.compareFunction=t.isReversedDepthBuffer()?zm:Om,l=cm):l=Fy,t.setTexture2D(e||l,a)}function FA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Oy,a)}function kA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||zy,a)}function OA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||ky,a)}function zA(i){switch(i){case 5126:return yA;case 35664:return SA;case 35665:return MA;case 35666:return EA;case 35674:return wA;case 35675:return bA;case 35676:return TA;case 5124:case 35670:return CA;case 35667:case 35671:return RA;case 35668:case 35672:return AA;case 35669:case 35673:return PA;case 5125:return NA;case 36294:return LA;case 36295:return DA;case 36296:return IA;case 35678:case 36198:case 36298:case 36306:case 35682:return UA;case 35679:case 36299:case 36307:return FA;case 35680:case 36300:case 36308:case 36293:return kA;case 36289:case 36303:case 36311:case 36292:return OA}}function BA(i,e){i.uniform1fv(this.addr,e)}function HA(i,e){const t=jo(e,this.size,2);i.uniform2fv(this.addr,t)}function VA(i,e){const t=jo(e,this.size,3);i.uniform3fv(this.addr,t)}function GA(i,e){const t=jo(e,this.size,4);i.uniform4fv(this.addr,t)}function jA(i,e){const t=jo(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function WA(i,e){const t=jo(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function XA(i,e){const t=jo(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function $A(i,e){i.uniform1iv(this.addr,e)}function qA(i,e){i.uniform2iv(this.addr,e)}function KA(i,e){i.uniform3iv(this.addr,e)}function YA(i,e){i.uniform4iv(this.addr,e)}function QA(i,e){i.uniform1uiv(this.addr,e)}function ZA(i,e){i.uniform2uiv(this.addr,e)}function JA(i,e){i.uniform3uiv(this.addr,e)}function e2(i,e){i.uniform4uiv(this.addr,e)}function t2(i,e,t){const r=this.cache,a=e.length,l=bd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=cm:c=Fy;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function n2(i,e,t){const r=this.cache,a=e.length,l=bd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Oy,l[c])}function i2(i,e,t){const r=this.cache,a=e.length,l=bd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||zy,l[c])}function r2(i,e,t){const r=this.cache,a=e.length,l=bd(t,a);wn(r,l)||(i.uniform1iv(this.addr,l),bn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||ky,l[c])}function s2(i){switch(i){case 5126:return BA;case 35664:return HA;case 35665:return VA;case 35666:return GA;case 35674:return jA;case 35675:return WA;case 35676:return XA;case 5124:case 35670:return $A;case 35667:case 35671:return qA;case 35668:case 35672:return KA;case 35669:case 35673:return YA;case 5125:return QA;case 36294:return ZA;case 36295:return JA;case 36296:return e2;case 35678:case 36198:case 36298:case 36306:case 35682:return t2;case 35679:case 36299:case 36307:return n2;case 35680:case 36300:case 36308:case 36293:return i2;case 36289:case 36303:case 36311:case 36292:return r2}}class a2{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=zA(t.type)}}class o2{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=s2(t.type)}}class l2{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const Qf=/(\w+)(\])?(\[|\.)?/g;function Vv(i,e){i.seq.push(e),i.map[e.id]=e}function c2(i,e,t){const r=i.name,a=r.length;for(Qf.lastIndex=0;;){const l=Qf.exec(r),c=Qf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){Vv(t,f===void 0?new a2(d,i,e):new o2(d,i,e));break}else{let p=t.map[d];p===void 0&&(p=new l2(d),Vv(t,p)),t=p}}}class Ju{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);c2(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Gv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const u2=37297;let d2=0;function h2(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const jv=new pt;function f2(i){Ct._getMatrix(jv,Ct.workingColorSpace,i);const e=`mat3( ${jv.elements.map(t=>t.toFixed(4))} )`;switch(Ct.getTransfer(i)){case cd:return[e,"LinearTransferOETF"];case Gt:return[e,"sRGBTransferOETF"];default:return lt("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Wv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+h2(i.getShaderSource(e),d)}else return l}function p2(i,e){const t=f2(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const m2={[ly]:"Linear",[cy]:"Reinhard",[uy]:"Cineon",[Nm]:"ACESFilmic",[hy]:"AgX",[fy]:"Neutral",[dy]:"Custom"};function g2(i,e){const t=m2[e];return t===void 0?(lt("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Bu=new ne;function x2(){Ct.getLuminanceCoefficients(Bu);const i=Bu.x.toFixed(4),e=Bu.y.toFixed(4),t=Bu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function v2(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Bl).join(`
`)}function _2(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function y2(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function Bl(i){return i!==""}function Xv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function $v(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const S2=/^[ \t]*#include +<([\w\d./]+)>/gm;function um(i){return i.replace(S2,E2)}const M2=new Map;function E2(i,e){let t=_t[e];if(t===void 0){const r=M2.get(e);if(r!==void 0)t=_t[r],lt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return um(t)}const w2=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function qv(i){return i.replace(w2,b2)}function b2(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function Kv(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const T2={[Xu]:"SHADOWMAP_TYPE_PCF",[kl]:"SHADOWMAP_TYPE_VSM"};function C2(i){return T2[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const R2={[ba]:"ENVMAP_TYPE_CUBE",[Uo]:"ENVMAP_TYPE_CUBE",[Sd]:"ENVMAP_TYPE_CUBE_UV"};function A2(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":R2[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const P2={[Uo]:"ENVMAP_MODE_REFRACTION"};function N2(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":P2[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const L2={[Pm]:"ENVMAP_BLENDING_MULTIPLY",[cb]:"ENVMAP_BLENDING_MIX",[ub]:"ENVMAP_BLENDING_ADD"};function D2(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":L2[i.combine]||"ENVMAP_BLENDING_NONE"}function I2(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function U2(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=C2(t),f=A2(t),x=N2(t),p=D2(t),v=I2(t),_=v2(t),E=_2(l),w=a.createProgram();let M,S,A=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(M=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),M.length>0&&(M+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(Bl).join(`
`),S.length>0&&(S+=`
`)):(M=[Kv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+x:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Bl).join(`
`),S=[Kv(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+x:"",t.envMap?"#define "+p:"",v?"#define CUBEUV_TEXEL_WIDTH "+v.texelWidth:"",v?"#define CUBEUV_TEXEL_HEIGHT "+v.texelHeight:"",v?"#define CUBEUV_MAX_MIP "+v.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==xr?"#define TONE_MAPPING":"",t.toneMapping!==xr?_t.tonemapping_pars_fragment:"",t.toneMapping!==xr?g2("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",_t.colorspace_pars_fragment,p2("linearToOutputTexel",t.outputColorSpace),x2(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Bl).join(`
`)),c=um(c),c=Xv(c,t),c=$v(c,t),d=um(d),d=Xv(d,t),d=$v(d,t),c=qv(c),d=qv(d),t.isRawShaderMaterial!==!0&&(A=`#version 300 es
`,M=[_,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+M,S=["#define varying in",t.glslVersion===Zx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Zx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const L=A+M+c,C=A+S+d,I=Gv(a,a.VERTEX_SHADER,L),N=Gv(a,a.FRAGMENT_SHADER,C);a.attachShader(w,I),a.attachShader(w,N),t.index0AttributeName!==void 0?a.bindAttribLocation(w,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(w,0,"position"),a.linkProgram(w);function U(V){if(i.debug.checkShaderErrors){const W=a.getProgramInfoLog(w)||"",j=a.getShaderInfoLog(I)||"",ue=a.getShaderInfoLog(N)||"",q=W.trim(),pe=j.trim(),J=ue.trim();let K=!0,re=!0;if(a.getProgramParameter(w,a.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,w,I,N);else{const he=Wv(a,I,"vertex"),z=Wv(a,N,"fragment");Dt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(w,a.VALIDATE_STATUS)+`

Material Name: `+V.name+`
Material Type: `+V.type+`

Program Info Log: `+q+`
`+he+`
`+z)}else q!==""?lt("WebGLProgram: Program Info Log:",q):(pe===""||J==="")&&(re=!1);re&&(V.diagnostics={runnable:K,programLog:q,vertexShader:{log:pe,prefix:M},fragmentShader:{log:J,prefix:S}})}a.deleteShader(I),a.deleteShader(N),b=new Ju(a,w),D=y2(a,w)}let b;this.getUniforms=function(){return b===void 0&&U(this),b};let D;this.getAttributes=function(){return D===void 0&&U(this),D};let O=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return O===!1&&(O=a.getProgramParameter(w,u2)),O},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(w),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=d2++,this.cacheKey=e,this.usedTimes=1,this.program=w,this.vertexShader=I,this.fragmentShader=N,this}let F2=0;class k2{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new O2(e),t.set(e,r)),r}}class O2{constructor(e){this.id=F2++,this.code=e,this.usedTimes=0}}function z2(i){return i===Ta||i===sd||i===ad}function B2(i,e,t,r,a,l){const c=new wy,d=new k2,h=new Set,f=[],x=new Map,p=r.logarithmicDepthBuffer;let v=r.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(b){return h.add(b),b===0?"uv":`uv${b}`}function w(b,D,O,V,W,j){const ue=V.fog,q=W.geometry,pe=b.isMeshStandardMaterial||b.isMeshLambertMaterial||b.isMeshPhongMaterial?V.environment:null,J=b.isMeshStandardMaterial||b.isMeshLambertMaterial&&!b.envMap||b.isMeshPhongMaterial&&!b.envMap,K=e.get(b.envMap||pe,J),re=K&&K.mapping===Sd?K.image.height:null,he=_[b.type];b.precision!==null&&(v=r.getMaxPrecision(b.precision),v!==b.precision&&lt("WebGLProgram.getParameters:",b.precision,"not supported, using",v,"instead."));const z=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,ie=z!==void 0?z.length:0;let Ie=0;q.morphAttributes.position!==void 0&&(Ie=1),q.morphAttributes.normal!==void 0&&(Ie=2),q.morphAttributes.color!==void 0&&(Ie=3);let je,He,H,ve;if(he){const qe=ur[he];je=qe.vertexShader,He=qe.fragmentShader}else{je=b.vertexShader,He=b.fragmentShader;const qe=d.getVertexShaderStage(b),Wt=d.getFragmentShaderStage(b);d.update(b,qe,Wt),H=qe.id,ve=Wt.id}const fe=i.getRenderTarget(),te=i.state.buffers.depth.getReversed(),Fe=W.isInstancedMesh===!0,Xe=W.isBatchedMesh===!0,kt=!!b.map,ct=!!b.matcap,Nt=!!K,bt=!!b.aoMap,yt=!!b.lightMap,qt=!!b.bumpMap&&b.wireframe===!1,nn=!!b.normalMap,jt=!!b.displacementMap,Kt=!!b.emissiveMap,It=!!b.metalnessMap,Yt=!!b.roughnessMap,Q=b.anisotropy>0,mn=b.clearcoat>0,Rt=b.dispersion>0,F=b.iridescence>0,T=b.sheen>0,ee=b.transmission>0,ae=Q&&!!b.anisotropyMap,xe=mn&&!!b.clearcoatMap,Te=mn&&!!b.clearcoatNormalMap,Ne=mn&&!!b.clearcoatRoughnessMap,_e=F&&!!b.iridescenceMap,ye=F&&!!b.iridescenceThicknessMap,de=T&&!!b.sheenColorMap,Ue=T&&!!b.sheenRoughnessMap,Ce=!!b.specularMap,Ae=!!b.specularColorMap,Je=!!b.specularIntensityMap,it=ee&&!!b.transmissionMap,st=ee&&!!b.thicknessMap,$=!!b.gradientMap,Le=!!b.alphaMap,Se=b.alphaTest>0,ke=!!b.alphaHash,Oe=!!b.extensions;let Me=xr;b.toneMapped&&(fe===null||fe.isXRRenderTarget===!0)&&(Me=i.toneMapping);const Ye={shaderID:he,shaderType:b.type,shaderName:b.name,vertexShader:je,fragmentShader:He,defines:b.defines,customVertexShaderID:H,customFragmentShaderID:ve,isRawShaderMaterial:b.isRawShaderMaterial===!0,glslVersion:b.glslVersion,precision:v,batching:Xe,batchingColor:Xe&&W._colorsTexture!==null,instancing:Fe,instancingColor:Fe&&W.instanceColor!==null,instancingMorph:Fe&&W.morphTexture!==null,outputColorSpace:fe===null?i.outputColorSpace:fe.isXRRenderTarget===!0?fe.texture.colorSpace:Ct.workingColorSpace,alphaToCoverage:!!b.alphaToCoverage,map:kt,matcap:ct,envMap:Nt,envMapMode:Nt&&K.mapping,envMapCubeUVHeight:re,aoMap:bt,lightMap:yt,bumpMap:qt,normalMap:nn,displacementMap:jt,emissiveMap:Kt,normalMapObjectSpace:nn&&b.normalMapType===fb,normalMapTangentSpace:nn&&b.normalMapType===od,packedNormalMap:nn&&b.normalMapType===od&&z2(b.normalMap.format),metalnessMap:It,roughnessMap:Yt,anisotropy:Q,anisotropyMap:ae,clearcoat:mn,clearcoatMap:xe,clearcoatNormalMap:Te,clearcoatRoughnessMap:Ne,dispersion:Rt,iridescence:F,iridescenceMap:_e,iridescenceThicknessMap:ye,sheen:T,sheenColorMap:de,sheenRoughnessMap:Ue,specularMap:Ce,specularColorMap:Ae,specularIntensityMap:Je,transmission:ee,transmissionMap:it,thicknessMap:st,gradientMap:$,opaque:b.transparent===!1&&b.blending===vo&&b.alphaToCoverage===!1,alphaMap:Le,alphaTest:Se,alphaHash:ke,combine:b.combine,mapUv:kt&&E(b.map.channel),aoMapUv:bt&&E(b.aoMap.channel),lightMapUv:yt&&E(b.lightMap.channel),bumpMapUv:qt&&E(b.bumpMap.channel),normalMapUv:nn&&E(b.normalMap.channel),displacementMapUv:jt&&E(b.displacementMap.channel),emissiveMapUv:Kt&&E(b.emissiveMap.channel),metalnessMapUv:It&&E(b.metalnessMap.channel),roughnessMapUv:Yt&&E(b.roughnessMap.channel),anisotropyMapUv:ae&&E(b.anisotropyMap.channel),clearcoatMapUv:xe&&E(b.clearcoatMap.channel),clearcoatNormalMapUv:Te&&E(b.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Ne&&E(b.clearcoatRoughnessMap.channel),iridescenceMapUv:_e&&E(b.iridescenceMap.channel),iridescenceThicknessMapUv:ye&&E(b.iridescenceThicknessMap.channel),sheenColorMapUv:de&&E(b.sheenColorMap.channel),sheenRoughnessMapUv:Ue&&E(b.sheenRoughnessMap.channel),specularMapUv:Ce&&E(b.specularMap.channel),specularColorMapUv:Ae&&E(b.specularColorMap.channel),specularIntensityMapUv:Je&&E(b.specularIntensityMap.channel),transmissionMapUv:it&&E(b.transmissionMap.channel),thicknessMapUv:st&&E(b.thicknessMap.channel),alphaMapUv:Le&&E(b.alphaMap.channel),vertexTangents:!!q.attributes.tangent&&(nn||Q),vertexNormals:!!q.attributes.normal,vertexColors:b.vertexColors,vertexAlphas:b.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,pointsUvs:W.isPoints===!0&&!!q.attributes.uv&&(kt||Le),fog:!!ue,useFog:b.fog===!0,fogExp2:!!ue&&ue.isFogExp2,flatShading:b.wireframe===!1&&(b.flatShading===!0||q.attributes.normal===void 0&&nn===!1&&(b.isMeshLambertMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isMeshPhysicalMaterial)),sizeAttenuation:b.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:te,skinning:W.isSkinnedMesh===!0,hasPositionAttribute:q.attributes.position!==void 0,morphTargets:q.morphAttributes.position!==void 0,morphNormals:q.morphAttributes.normal!==void 0,morphColors:q.morphAttributes.color!==void 0,morphTargetsCount:ie,morphTextureStride:Ie,numDirLights:D.directional.length,numPointLights:D.point.length,numSpotLights:D.spot.length,numSpotLightMaps:D.spotLightMap.length,numRectAreaLights:D.rectArea.length,numHemiLights:D.hemi.length,numDirLightShadows:D.directionalShadowMap.length,numPointLightShadows:D.pointShadowMap.length,numSpotLightShadows:D.spotShadowMap.length,numSpotLightShadowsWithMaps:D.numSpotLightShadowsWithMaps,numLightProbes:D.numLightProbes,numLightProbeGrids:j.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:b.dithering,shadowMapEnabled:i.shadowMap.enabled&&O.length>0,shadowMapType:i.shadowMap.type,toneMapping:Me,decodeVideoTexture:kt&&b.map.isVideoTexture===!0&&Ct.getTransfer(b.map.colorSpace)===Gt,decodeVideoTextureEmissive:Kt&&b.emissiveMap.isVideoTexture===!0&&Ct.getTransfer(b.emissiveMap.colorSpace)===Gt,premultipliedAlpha:b.premultipliedAlpha,doubleSided:b.side===hr,flipSided:b.side===hi,useDepthPacking:b.depthPacking>=0,depthPacking:b.depthPacking||0,index0AttributeName:b.index0AttributeName,extensionClipCullDistance:Oe&&b.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Oe&&b.extensions.multiDraw===!0||Xe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:b.customProgramCacheKey()};return Ye.vertexUv1s=h.has(1),Ye.vertexUv2s=h.has(2),Ye.vertexUv3s=h.has(3),h.clear(),Ye}function M(b){const D=[];if(b.shaderID?D.push(b.shaderID):(D.push(b.customVertexShaderID),D.push(b.customFragmentShaderID)),b.defines!==void 0)for(const O in b.defines)D.push(O),D.push(b.defines[O]);return b.isRawShaderMaterial===!1&&(S(D,b),A(D,b),D.push(i.outputColorSpace)),D.push(b.customProgramCacheKey),D.join()}function S(b,D){b.push(D.precision),b.push(D.outputColorSpace),b.push(D.envMapMode),b.push(D.envMapCubeUVHeight),b.push(D.mapUv),b.push(D.alphaMapUv),b.push(D.lightMapUv),b.push(D.aoMapUv),b.push(D.bumpMapUv),b.push(D.normalMapUv),b.push(D.displacementMapUv),b.push(D.emissiveMapUv),b.push(D.metalnessMapUv),b.push(D.roughnessMapUv),b.push(D.anisotropyMapUv),b.push(D.clearcoatMapUv),b.push(D.clearcoatNormalMapUv),b.push(D.clearcoatRoughnessMapUv),b.push(D.iridescenceMapUv),b.push(D.iridescenceThicknessMapUv),b.push(D.sheenColorMapUv),b.push(D.sheenRoughnessMapUv),b.push(D.specularMapUv),b.push(D.specularColorMapUv),b.push(D.specularIntensityMapUv),b.push(D.transmissionMapUv),b.push(D.thicknessMapUv),b.push(D.combine),b.push(D.fogExp2),b.push(D.sizeAttenuation),b.push(D.morphTargetsCount),b.push(D.morphAttributeCount),b.push(D.numDirLights),b.push(D.numPointLights),b.push(D.numSpotLights),b.push(D.numSpotLightMaps),b.push(D.numHemiLights),b.push(D.numRectAreaLights),b.push(D.numDirLightShadows),b.push(D.numPointLightShadows),b.push(D.numSpotLightShadows),b.push(D.numSpotLightShadowsWithMaps),b.push(D.numLightProbes),b.push(D.shadowMapType),b.push(D.toneMapping),b.push(D.numClippingPlanes),b.push(D.numClipIntersection),b.push(D.depthPacking)}function A(b,D){c.disableAll(),D.instancing&&c.enable(0),D.instancingColor&&c.enable(1),D.instancingMorph&&c.enable(2),D.matcap&&c.enable(3),D.envMap&&c.enable(4),D.normalMapObjectSpace&&c.enable(5),D.normalMapTangentSpace&&c.enable(6),D.clearcoat&&c.enable(7),D.iridescence&&c.enable(8),D.alphaTest&&c.enable(9),D.vertexColors&&c.enable(10),D.vertexAlphas&&c.enable(11),D.vertexUv1s&&c.enable(12),D.vertexUv2s&&c.enable(13),D.vertexUv3s&&c.enable(14),D.vertexTangents&&c.enable(15),D.anisotropy&&c.enable(16),D.alphaHash&&c.enable(17),D.batching&&c.enable(18),D.dispersion&&c.enable(19),D.batchingColor&&c.enable(20),D.gradientMap&&c.enable(21),D.packedNormalMap&&c.enable(22),D.vertexNormals&&c.enable(23),b.push(c.mask),c.disableAll(),D.fog&&c.enable(0),D.useFog&&c.enable(1),D.flatShading&&c.enable(2),D.logarithmicDepthBuffer&&c.enable(3),D.reversedDepthBuffer&&c.enable(4),D.skinning&&c.enable(5),D.morphTargets&&c.enable(6),D.morphNormals&&c.enable(7),D.morphColors&&c.enable(8),D.premultipliedAlpha&&c.enable(9),D.shadowMapEnabled&&c.enable(10),D.doubleSided&&c.enable(11),D.flipSided&&c.enable(12),D.useDepthPacking&&c.enable(13),D.dithering&&c.enable(14),D.transmission&&c.enable(15),D.sheen&&c.enable(16),D.opaque&&c.enable(17),D.pointsUvs&&c.enable(18),D.decodeVideoTexture&&c.enable(19),D.decodeVideoTextureEmissive&&c.enable(20),D.alphaToCoverage&&c.enable(21),D.numLightProbeGrids>0&&c.enable(22),D.hasPositionAttribute&&c.enable(23),b.push(c.mask)}function L(b){const D=_[b.type];let O;if(D){const V=ur[D];O=Zb.clone(V.uniforms)}else O=b.uniforms;return O}function C(b,D){let O=x.get(D);return O!==void 0?++O.usedTimes:(O=new U2(i,D,b,a),f.push(O),x.set(D,O)),O}function I(b){if(--b.usedTimes===0){const D=f.indexOf(b);f[D]=f[f.length-1],f.pop(),x.delete(b.cacheKey),b.destroy()}}function N(b){d.remove(b)}function U(){d.dispose()}return{getParameters:w,getProgramCacheKey:M,getUniforms:L,acquireProgram:C,releaseProgram:I,releaseShaderCache:N,programs:f,dispose:U}}function H2(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function V2(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Yv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Qv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(v){let _=0;return v.isInstancedMesh&&(_+=2),v.isSkinnedMesh&&(_+=1),_}function d(v,_,E,w,M,S){let A=i[e];return A===void 0?(A={id:v.id,object:v,geometry:_,material:E,materialVariant:c(v),groupOrder:w,renderOrder:v.renderOrder,z:M,group:S},i[e]=A):(A.id=v.id,A.object=v,A.geometry=_,A.material=E,A.materialVariant=c(v),A.groupOrder=w,A.renderOrder=v.renderOrder,A.z=M,A.group=S),e++,A}function h(v,_,E,w,M,S){const A=d(v,_,E,w,M,S);E.transmission>0?r.push(A):E.transparent===!0?a.push(A):t.push(A)}function f(v,_,E,w,M,S){const A=d(v,_,E,w,M,S);E.transmission>0?r.unshift(A):E.transparent===!0?a.unshift(A):t.unshift(A)}function x(v,_,E){t.length>1&&t.sort(v||V2),r.length>1&&r.sort(_||Yv),a.length>1&&a.sort(_||Yv),E&&(t.reverse(),r.reverse(),a.reverse())}function p(){for(let v=e,_=i.length;v<_;v++){const E=i[v];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:p,sort:x}}function G2(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new Qv,i.set(r,[c])):a>=l.length?(c=new Qv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function j2(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ne,color:new vt};break;case"SpotLight":t={position:new ne,direction:new ne,color:new vt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ne,color:new vt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ne,skyColor:new vt,groundColor:new vt};break;case"RectAreaLight":t={color:new vt,position:new ne,halfWidth:new ne,halfHeight:new ne};break}return i[e.id]=t,t}}}function W2(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new dt,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let X2=0;function $2(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function q2(i){const e=new j2,t=W2(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new ne);const a=new ne,l=new on,c=new on;function d(f){let x=0,p=0,v=0;for(let D=0;D<9;D++)r.probe[D].set(0,0,0);let _=0,E=0,w=0,M=0,S=0,A=0,L=0,C=0,I=0,N=0,U=0;f.sort($2);for(let D=0,O=f.length;D<O;D++){const V=f[D],W=V.color,j=V.intensity,ue=V.distance;let q=null;if(V.shadow&&V.shadow.map&&(V.shadow.map.texture.format===Ta?q=V.shadow.map.texture:q=V.shadow.map.depthTexture||V.shadow.map.texture),V.isAmbientLight)x+=W.r*j,p+=W.g*j,v+=W.b*j;else if(V.isLightProbe){for(let pe=0;pe<9;pe++)r.probe[pe].addScaledVector(V.sh.coefficients[pe],j);U++}else if(V.isDirectionalLight){const pe=e.get(V);if(pe.color.copy(V.color).multiplyScalar(V.intensity),V.castShadow){const J=V.shadow,K=t.get(V);K.shadowIntensity=J.intensity,K.shadowBias=J.bias,K.shadowNormalBias=J.normalBias,K.shadowRadius=J.radius,K.shadowMapSize=J.mapSize,r.directionalShadow[_]=K,r.directionalShadowMap[_]=q,r.directionalShadowMatrix[_]=V.shadow.matrix,A++}r.directional[_]=pe,_++}else if(V.isSpotLight){const pe=e.get(V);pe.position.setFromMatrixPosition(V.matrixWorld),pe.color.copy(W).multiplyScalar(j),pe.distance=ue,pe.coneCos=Math.cos(V.angle),pe.penumbraCos=Math.cos(V.angle*(1-V.penumbra)),pe.decay=V.decay,r.spot[w]=pe;const J=V.shadow;if(V.map&&(r.spotLightMap[I]=V.map,I++,J.updateMatrices(V),V.castShadow&&N++),r.spotLightMatrix[w]=J.matrix,V.castShadow){const K=t.get(V);K.shadowIntensity=J.intensity,K.shadowBias=J.bias,K.shadowNormalBias=J.normalBias,K.shadowRadius=J.radius,K.shadowMapSize=J.mapSize,r.spotShadow[w]=K,r.spotShadowMap[w]=q,C++}w++}else if(V.isRectAreaLight){const pe=e.get(V);pe.color.copy(W).multiplyScalar(j),pe.halfWidth.set(V.width*.5,0,0),pe.halfHeight.set(0,V.height*.5,0),r.rectArea[M]=pe,M++}else if(V.isPointLight){const pe=e.get(V);if(pe.color.copy(V.color).multiplyScalar(V.intensity),pe.distance=V.distance,pe.decay=V.decay,V.castShadow){const J=V.shadow,K=t.get(V);K.shadowIntensity=J.intensity,K.shadowBias=J.bias,K.shadowNormalBias=J.normalBias,K.shadowRadius=J.radius,K.shadowMapSize=J.mapSize,K.shadowCameraNear=J.camera.near,K.shadowCameraFar=J.camera.far,r.pointShadow[E]=K,r.pointShadowMap[E]=q,r.pointShadowMatrix[E]=V.shadow.matrix,L++}r.point[E]=pe,E++}else if(V.isHemisphereLight){const pe=e.get(V);pe.skyColor.copy(V.color).multiplyScalar(j),pe.groundColor.copy(V.groundColor).multiplyScalar(j),r.hemi[S]=pe,S++}}M>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ze.LTC_FLOAT_1,r.rectAreaLTC2=ze.LTC_FLOAT_2):(r.rectAreaLTC1=ze.LTC_HALF_1,r.rectAreaLTC2=ze.LTC_HALF_2)),r.ambient[0]=x,r.ambient[1]=p,r.ambient[2]=v;const b=r.hash;(b.directionalLength!==_||b.pointLength!==E||b.spotLength!==w||b.rectAreaLength!==M||b.hemiLength!==S||b.numDirectionalShadows!==A||b.numPointShadows!==L||b.numSpotShadows!==C||b.numSpotMaps!==I||b.numLightProbes!==U)&&(r.directional.length=_,r.spot.length=w,r.rectArea.length=M,r.point.length=E,r.hemi.length=S,r.directionalShadow.length=A,r.directionalShadowMap.length=A,r.pointShadow.length=L,r.pointShadowMap.length=L,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=A,r.pointShadowMatrix.length=L,r.spotLightMatrix.length=C+I-N,r.spotLightMap.length=I,r.numSpotLightShadowsWithMaps=N,r.numLightProbes=U,b.directionalLength=_,b.pointLength=E,b.spotLength=w,b.rectAreaLength=M,b.hemiLength=S,b.numDirectionalShadows=A,b.numPointShadows=L,b.numSpotShadows=C,b.numSpotMaps=I,b.numLightProbes=U,r.version=X2++)}function h(f,x){let p=0,v=0,_=0,E=0,w=0;const M=x.matrixWorldInverse;for(let S=0,A=f.length;S<A;S++){const L=f[S];if(L.isDirectionalLight){const C=r.directional[p];C.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(M),p++}else if(L.isSpotLight){const C=r.spot[_];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(M),C.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(M),_++}else if(L.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(M),c.identity(),l.copy(L.matrixWorld),l.premultiply(M),c.extractRotation(l),C.halfWidth.set(L.width*.5,0,0),C.halfHeight.set(0,L.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(L.isPointLight){const C=r.point[v];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(M),v++}else if(L.isHemisphereLight){const C=r.hemi[w];C.direction.setFromMatrixPosition(L.matrixWorld),C.direction.transformDirection(M),w++}}}return{setup:d,setupView:h,state:r}}function Zv(i){const e=new q2(i),t=[],r=[],a=[];function l(v){p.camera=v,t.length=0,r.length=0,a.length=0}function c(v){t.push(v)}function d(v){r.push(v)}function h(v){a.push(v)}function f(){e.setup(t)}function x(v){e.setupView(t,v)}const p={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:p,setupLights:f,setupLightsView:x,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function K2(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new Zv(i),e.set(a,[d])):l>=c.length?(d=new Zv(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const Y2=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Q2=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Z2=[new ne(1,0,0),new ne(-1,0,0),new ne(0,1,0),new ne(0,-1,0),new ne(0,0,1),new ne(0,0,-1)],J2=[new ne(0,-1,0),new ne(0,-1,0),new ne(0,0,1),new ne(0,0,-1),new ne(0,-1,0),new ne(0,-1,0)],Jv=new on,Ul=new ne,Zf=new ne;function eP(i,e,t){let r=new Hm;const a=new dt,l=new dt,c=new dn,d=new iT,h=new rT,f={},x=t.maxTextureSize,p={[Os]:hi,[hi]:Os,[hr]:hr},v=new Mr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new dt},radius:{value:4}},vertexShader:Y2,fragmentShader:Q2}),_=v.clone();_.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new _r(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const w=new Qi(E,v),M=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Xu;let S=this.type;this.render=function(N,U,b){if(M.enabled===!1||M.autoUpdate===!1&&M.needsUpdate===!1||N.length===0)return;this.type===jw&&(lt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Xu);const D=i.getRenderTarget(),O=i.getActiveCubeFace(),V=i.getActiveMipmapLevel(),W=i.state;W.setBlending(Wr),W.buffers.depth.getReversed()===!0?W.buffers.color.setClear(0,0,0,0):W.buffers.color.setClear(1,1,1,1),W.buffers.depth.setTest(!0),W.setScissorTest(!1);const j=S!==this.type;j&&U.traverse(function(ue){ue.material&&(Array.isArray(ue.material)?ue.material.forEach(q=>q.needsUpdate=!0):ue.material.needsUpdate=!0)});for(let ue=0,q=N.length;ue<q;ue++){const pe=N[ue],J=pe.shadow;if(J===void 0){lt("WebGLShadowMap:",pe,"has no shadow.");continue}if(J.autoUpdate===!1&&J.needsUpdate===!1)continue;a.copy(J.mapSize);const K=J.getFrameExtents();a.multiply(K),l.copy(J.mapSize),(a.x>x||a.y>x)&&(a.x>x&&(l.x=Math.floor(x/K.x),a.x=l.x*K.x,J.mapSize.x=l.x),a.y>x&&(l.y=Math.floor(x/K.y),a.y=l.y*K.y,J.mapSize.y=l.y));const re=i.state.buffers.depth.getReversed();if(J.camera._reversedDepth=re,J.map===null||j===!0){if(J.map!==null&&(J.map.depthTexture!==null&&(J.map.depthTexture.dispose(),J.map.depthTexture=null),J.map.dispose()),this.type===kl){if(pe.isPointLight){lt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}J.map=new vr(a.x,a.y,{format:Ta,type:Kr,minFilter:jn,magFilter:jn,generateMipmaps:!1}),J.map.texture.name=pe.name+".shadowMap",J.map.depthTexture=new Fo(a.x,a.y,pr),J.map.depthTexture.name=pe.name+".shadowMapDepth",J.map.depthTexture.format=Yr,J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=Un,J.map.depthTexture.magFilter=Un}else pe.isPointLight?(J.map=new Uy(a.x),J.map.depthTexture=new Yb(a.x,yr)):(J.map=new vr(a.x,a.y),J.map.depthTexture=new Fo(a.x,a.y,yr)),J.map.depthTexture.name=pe.name+".shadowMap",J.map.depthTexture.format=Yr,this.type===Xu?(J.map.depthTexture.compareFunction=re?zm:Om,J.map.depthTexture.minFilter=jn,J.map.depthTexture.magFilter=jn):(J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=Un,J.map.depthTexture.magFilter=Un);J.camera.updateProjectionMatrix()}const he=J.map.isWebGLCubeRenderTarget?6:1;for(let z=0;z<he;z++){if(J.map.isWebGLCubeRenderTarget)i.setRenderTarget(J.map,z),i.clear();else{z===0&&(i.setRenderTarget(J.map),i.clear());const ie=J.getViewport(z);c.set(l.x*ie.x,l.y*ie.y,l.x*ie.z,l.y*ie.w),W.viewport(c)}if(pe.isPointLight){const ie=J.camera,Ie=J.matrix,je=pe.distance||ie.far;je!==ie.far&&(ie.far=je,ie.updateProjectionMatrix()),Ul.setFromMatrixPosition(pe.matrixWorld),ie.position.copy(Ul),Zf.copy(ie.position),Zf.add(Z2[z]),ie.up.copy(J2[z]),ie.lookAt(Zf),ie.updateMatrixWorld(),Ie.makeTranslation(-Ul.x,-Ul.y,-Ul.z),Jv.multiplyMatrices(ie.projectionMatrix,ie.matrixWorldInverse),J._frustum.setFromProjectionMatrix(Jv,ie.coordinateSystem,ie.reversedDepth)}else J.updateMatrices(pe);r=J.getFrustum(),C(U,b,J.camera,pe,this.type)}J.isPointLightShadow!==!0&&this.type===kl&&A(J,b),J.needsUpdate=!1}S=this.type,M.needsUpdate=!1,i.setRenderTarget(D,O,V)};function A(N,U){const b=e.update(w);v.defines.VSM_SAMPLES!==N.blurSamples&&(v.defines.VSM_SAMPLES=N.blurSamples,_.defines.VSM_SAMPLES=N.blurSamples,v.needsUpdate=!0,_.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new vr(a.x,a.y,{format:Ta,type:Kr})),v.uniforms.shadow_pass.value=N.map.depthTexture,v.uniforms.resolution.value=N.mapSize,v.uniforms.radius.value=N.radius,i.setRenderTarget(N.mapPass),i.clear(),i.renderBufferDirect(U,null,b,v,w,null),_.uniforms.shadow_pass.value=N.mapPass.texture,_.uniforms.resolution.value=N.mapSize,_.uniforms.radius.value=N.radius,i.setRenderTarget(N.map),i.clear(),i.renderBufferDirect(U,null,b,_,w,null)}function L(N,U,b,D){let O=null;const V=b.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(V!==void 0)O=V;else if(O=b.isPointLight===!0?h:d,i.localClippingEnabled&&U.clipShadows===!0&&Array.isArray(U.clippingPlanes)&&U.clippingPlanes.length!==0||U.displacementMap&&U.displacementScale!==0||U.alphaMap&&U.alphaTest>0||U.map&&U.alphaTest>0||U.alphaToCoverage===!0){const W=O.uuid,j=U.uuid;let ue=f[W];ue===void 0&&(ue={},f[W]=ue);let q=ue[j];q===void 0&&(q=O.clone(),ue[j]=q,U.addEventListener("dispose",I)),O=q}if(O.visible=U.visible,O.wireframe=U.wireframe,D===kl?O.side=U.shadowSide!==null?U.shadowSide:U.side:O.side=U.shadowSide!==null?U.shadowSide:p[U.side],O.alphaMap=U.alphaMap,O.alphaTest=U.alphaToCoverage===!0?.5:U.alphaTest,O.map=U.map,O.clipShadows=U.clipShadows,O.clippingPlanes=U.clippingPlanes,O.clipIntersection=U.clipIntersection,O.displacementMap=U.displacementMap,O.displacementScale=U.displacementScale,O.displacementBias=U.displacementBias,O.wireframeLinewidth=U.wireframeLinewidth,O.linewidth=U.linewidth,b.isPointLight===!0&&O.isMeshDistanceMaterial===!0){const W=i.properties.get(O);W.light=b}return O}function C(N,U,b,D,O){if(N.visible===!1)return;if(N.layers.test(U.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&O===kl)&&(!N.frustumCulled||r.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,N.matrixWorld);const j=e.update(N),ue=N.material;if(Array.isArray(ue)){const q=j.groups;for(let pe=0,J=q.length;pe<J;pe++){const K=q[pe],re=ue[K.materialIndex];if(re&&re.visible){const he=L(N,re,D,O);N.onBeforeShadow(i,N,U,b,j,he,K),i.renderBufferDirect(b,null,j,he,N,K),N.onAfterShadow(i,N,U,b,j,he,K)}}}else if(ue.visible){const q=L(N,ue,D,O);N.onBeforeShadow(i,N,U,b,j,q,null),i.renderBufferDirect(b,null,j,q,N,null),N.onAfterShadow(i,N,U,b,j,q,null)}}const W=N.children;for(let j=0,ue=W.length;j<ue;j++)C(W[j],U,b,D,O)}function I(N){N.target.removeEventListener("dispose",I);for(const b in f){const D=f[b],O=N.target.uuid;O in D&&(D[O].dispose(),delete D[O])}}}function tP(i,e){function t(){let $=!1;const Le=new dn;let Se=null;const ke=new dn(0,0,0,0);return{setMask:function(Oe){Se!==Oe&&!$&&(i.colorMask(Oe,Oe,Oe,Oe),Se=Oe)},setLocked:function(Oe){$=Oe},setClear:function(Oe,Me,Ye,qe,Wt){Wt===!0&&(Oe*=qe,Me*=qe,Ye*=qe),Le.set(Oe,Me,Ye,qe),ke.equals(Le)===!1&&(i.clearColor(Oe,Me,Ye,qe),ke.copy(Le))},reset:function(){$=!1,Se=null,ke.set(-1,0,0,0)}}}function r(){let $=!1,Le=!1,Se=null,ke=null,Oe=null;return{setReversed:function(Me){if(Le!==Me){const Ye=e.get("EXT_clip_control");Me?Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.ZERO_TO_ONE_EXT):Ye.clipControlEXT(Ye.LOWER_LEFT_EXT,Ye.NEGATIVE_ONE_TO_ONE_EXT),Le=Me;const qe=Oe;Oe=null,this.setClear(qe)}},getReversed:function(){return Le},setTest:function(Me){Me?fe(i.DEPTH_TEST):te(i.DEPTH_TEST)},setMask:function(Me){Se!==Me&&!$&&(i.depthMask(Me),Se=Me)},setFunc:function(Me){if(Le&&(Me=Eb[Me]),ke!==Me){switch(Me){case Mp:i.depthFunc(i.NEVER);break;case Ep:i.depthFunc(i.ALWAYS);break;case wp:i.depthFunc(i.LESS);break;case Io:i.depthFunc(i.LEQUAL);break;case bp:i.depthFunc(i.EQUAL);break;case Tp:i.depthFunc(i.GEQUAL);break;case Cp:i.depthFunc(i.GREATER);break;case Rp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ke=Me}},setLocked:function(Me){$=Me},setClear:function(Me){Oe!==Me&&(Oe=Me,Le&&(Me=1-Me),i.clearDepth(Me))},reset:function(){$=!1,Se=null,ke=null,Oe=null,Le=!1}}}function a(){let $=!1,Le=null,Se=null,ke=null,Oe=null,Me=null,Ye=null,qe=null,Wt=null;return{setTest:function(Ot){$||(Ot?fe(i.STENCIL_TEST):te(i.STENCIL_TEST))},setMask:function(Ot){Le!==Ot&&!$&&(i.stencilMask(Ot),Le=Ot)},setFunc:function(Ot,Fn,wi){(Se!==Ot||ke!==Fn||Oe!==wi)&&(i.stencilFunc(Ot,Fn,wi),Se=Ot,ke=Fn,Oe=wi)},setOp:function(Ot,Fn,wi){(Me!==Ot||Ye!==Fn||qe!==wi)&&(i.stencilOp(Ot,Fn,wi),Me=Ot,Ye=Fn,qe=wi)},setLocked:function(Ot){$=Ot},setClear:function(Ot){Wt!==Ot&&(i.clearStencil(Ot),Wt=Ot)},reset:function(){$=!1,Le=null,Se=null,ke=null,Oe=null,Me=null,Ye=null,qe=null,Wt=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let x={},p={},v={},_=new WeakMap,E=[],w=null,M=!1,S=null,A=null,L=null,C=null,I=null,N=null,U=null,b=new vt(0,0,0),D=0,O=!1,V=null,W=null,j=null,ue=null,q=null;const pe=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let J=!1,K=0;const re=i.getParameter(i.VERSION);re.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(re)[1]),J=K>=1):re.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(re)[1]),J=K>=2);let he=null,z={};const ie=i.getParameter(i.SCISSOR_BOX),Ie=i.getParameter(i.VIEWPORT),je=new dn().fromArray(ie),He=new dn().fromArray(Ie);function H($,Le,Se,ke){const Oe=new Uint8Array(4),Me=i.createTexture();i.bindTexture($,Me),i.texParameteri($,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri($,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ye=0;Ye<Se;Ye++)$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?i.texImage3D(Le,0,i.RGBA,1,1,ke,0,i.RGBA,i.UNSIGNED_BYTE,Oe):i.texImage2D(Le+Ye,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Oe);return Me}const ve={};ve[i.TEXTURE_2D]=H(i.TEXTURE_2D,i.TEXTURE_2D,1),ve[i.TEXTURE_CUBE_MAP]=H(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ve[i.TEXTURE_2D_ARRAY]=H(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ve[i.TEXTURE_3D]=H(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),fe(i.DEPTH_TEST),c.setFunc(Io),qt(!1),nn(Xx),fe(i.CULL_FACE),bt(Wr);function fe($){x[$]!==!0&&(i.enable($),x[$]=!0)}function te($){x[$]!==!1&&(i.disable($),x[$]=!1)}function Fe($,Le){return v[$]!==Le?(i.bindFramebuffer($,Le),v[$]=Le,$===i.DRAW_FRAMEBUFFER&&(v[i.FRAMEBUFFER]=Le),$===i.FRAMEBUFFER&&(v[i.DRAW_FRAMEBUFFER]=Le),!0):!1}function Xe($,Le){let Se=E,ke=!1;if($){Se=_.get(Le),Se===void 0&&(Se=[],_.set(Le,Se));const Oe=$.textures;if(Se.length!==Oe.length||Se[0]!==i.COLOR_ATTACHMENT0){for(let Me=0,Ye=Oe.length;Me<Ye;Me++)Se[Me]=i.COLOR_ATTACHMENT0+Me;Se.length=Oe.length,ke=!0}}else Se[0]!==i.BACK&&(Se[0]=i.BACK,ke=!0);ke&&i.drawBuffers(Se)}function kt($){return w!==$?(i.useProgram($),w=$,!0):!1}const ct={[ca]:i.FUNC_ADD,[Xw]:i.FUNC_SUBTRACT,[$w]:i.FUNC_REVERSE_SUBTRACT};ct[qw]=i.MIN,ct[Kw]=i.MAX;const Nt={[Yw]:i.ZERO,[Qw]:i.ONE,[Zw]:i.SRC_COLOR,[yp]:i.SRC_ALPHA,[rb]:i.SRC_ALPHA_SATURATE,[nb]:i.DST_COLOR,[eb]:i.DST_ALPHA,[Jw]:i.ONE_MINUS_SRC_COLOR,[Sp]:i.ONE_MINUS_SRC_ALPHA,[ib]:i.ONE_MINUS_DST_COLOR,[tb]:i.ONE_MINUS_DST_ALPHA,[sb]:i.CONSTANT_COLOR,[ab]:i.ONE_MINUS_CONSTANT_COLOR,[ob]:i.CONSTANT_ALPHA,[lb]:i.ONE_MINUS_CONSTANT_ALPHA};function bt($,Le,Se,ke,Oe,Me,Ye,qe,Wt,Ot){if($===Wr){M===!0&&(te(i.BLEND),M=!1);return}if(M===!1&&(fe(i.BLEND),M=!0),$!==Ww){if($!==S||Ot!==O){if((A!==ca||I!==ca)&&(i.blendEquation(i.FUNC_ADD),A=ca,I=ca),Ot)switch($){case vo:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case $x:i.blendFunc(i.ONE,i.ONE);break;case qx:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Kx:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Dt("WebGLState: Invalid blending: ",$);break}else switch($){case vo:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case $x:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case qx:Dt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Kx:Dt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Dt("WebGLState: Invalid blending: ",$);break}L=null,C=null,N=null,U=null,b.set(0,0,0),D=0,S=$,O=Ot}return}Oe=Oe||Le,Me=Me||Se,Ye=Ye||ke,(Le!==A||Oe!==I)&&(i.blendEquationSeparate(ct[Le],ct[Oe]),A=Le,I=Oe),(Se!==L||ke!==C||Me!==N||Ye!==U)&&(i.blendFuncSeparate(Nt[Se],Nt[ke],Nt[Me],Nt[Ye]),L=Se,C=ke,N=Me,U=Ye),(qe.equals(b)===!1||Wt!==D)&&(i.blendColor(qe.r,qe.g,qe.b,Wt),b.copy(qe),D=Wt),S=$,O=!1}function yt($,Le){$.side===hr?te(i.CULL_FACE):fe(i.CULL_FACE);let Se=$.side===hi;Le&&(Se=!Se),qt(Se),$.blending===vo&&$.transparent===!1?bt(Wr):bt($.blending,$.blendEquation,$.blendSrc,$.blendDst,$.blendEquationAlpha,$.blendSrcAlpha,$.blendDstAlpha,$.blendColor,$.blendAlpha,$.premultipliedAlpha),c.setFunc($.depthFunc),c.setTest($.depthTest),c.setMask($.depthWrite),l.setMask($.colorWrite);const ke=$.stencilWrite;d.setTest(ke),ke&&(d.setMask($.stencilWriteMask),d.setFunc($.stencilFunc,$.stencilRef,$.stencilFuncMask),d.setOp($.stencilFail,$.stencilZFail,$.stencilZPass)),Kt($.polygonOffset,$.polygonOffsetFactor,$.polygonOffsetUnits),$.alphaToCoverage===!0?fe(i.SAMPLE_ALPHA_TO_COVERAGE):te(i.SAMPLE_ALPHA_TO_COVERAGE)}function qt($){V!==$&&($?i.frontFace(i.CW):i.frontFace(i.CCW),V=$)}function nn($){$!==Vw?(fe(i.CULL_FACE),$!==W&&($===Xx?i.cullFace(i.BACK):$===Gw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):te(i.CULL_FACE),W=$}function jt($){$!==j&&(J&&i.lineWidth($),j=$)}function Kt($,Le,Se){$?(fe(i.POLYGON_OFFSET_FILL),(ue!==Le||q!==Se)&&(ue=Le,q=Se,c.getReversed()&&(Le=-Le),i.polygonOffset(Le,Se))):te(i.POLYGON_OFFSET_FILL)}function It($){$?fe(i.SCISSOR_TEST):te(i.SCISSOR_TEST)}function Yt($){$===void 0&&($=i.TEXTURE0+pe-1),he!==$&&(i.activeTexture($),he=$)}function Q($,Le,Se){Se===void 0&&(he===null?Se=i.TEXTURE0+pe-1:Se=he);let ke=z[Se];ke===void 0&&(ke={type:void 0,texture:void 0},z[Se]=ke),(ke.type!==$||ke.texture!==Le)&&(he!==Se&&(i.activeTexture(Se),he=Se),i.bindTexture($,Le||ve[$]),ke.type=$,ke.texture=Le)}function mn(){const $=z[he];$!==void 0&&$.type!==void 0&&(i.bindTexture($.type,null),$.type=void 0,$.texture=void 0)}function Rt(){try{i.compressedTexImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function F(){try{i.compressedTexImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function T(){try{i.texSubImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function ee(){try{i.texSubImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function ae(){try{i.compressedTexSubImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function xe(){try{i.compressedTexSubImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function Te(){try{i.texStorage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function Ne(){try{i.texStorage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function _e(){try{i.texImage2D(...arguments)}catch($){Dt("WebGLState:",$)}}function ye(){try{i.texImage3D(...arguments)}catch($){Dt("WebGLState:",$)}}function de($){return p[$]!==void 0?p[$]:i.getParameter($)}function Ue($,Le){p[$]!==Le&&(i.pixelStorei($,Le),p[$]=Le)}function Ce($){je.equals($)===!1&&(i.scissor($.x,$.y,$.z,$.w),je.copy($))}function Ae($){He.equals($)===!1&&(i.viewport($.x,$.y,$.z,$.w),He.copy($))}function Je($,Le){let Se=f.get(Le);Se===void 0&&(Se=new WeakMap,f.set(Le,Se));let ke=Se.get($);ke===void 0&&(ke=i.getUniformBlockIndex(Le,$.name),Se.set($,ke))}function it($,Le){const ke=f.get(Le).get($);h.get(Le)!==ke&&(i.uniformBlockBinding(Le,ke,$.__bindingPointIndex),h.set(Le,ke))}function st(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),x={},p={},he=null,z={},v={},_=new WeakMap,E=[],w=null,M=!1,S=null,A=null,L=null,C=null,I=null,N=null,U=null,b=new vt(0,0,0),D=0,O=!1,V=null,W=null,j=null,ue=null,q=null,je.set(0,0,i.canvas.width,i.canvas.height),He.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:fe,disable:te,bindFramebuffer:Fe,drawBuffers:Xe,useProgram:kt,setBlending:bt,setMaterial:yt,setFlipSided:qt,setCullFace:nn,setLineWidth:jt,setPolygonOffset:Kt,setScissorTest:It,activeTexture:Yt,bindTexture:Q,unbindTexture:mn,compressedTexImage2D:Rt,compressedTexImage3D:F,texImage2D:_e,texImage3D:ye,pixelStorei:Ue,getParameter:de,updateUBOMapping:Je,uniformBlockBinding:it,texStorage2D:Te,texStorage3D:Ne,texSubImage2D:T,texSubImage3D:ee,compressedTexSubImage2D:ae,compressedTexSubImage3D:xe,scissor:Ce,viewport:Ae,reset:st}}function nP(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new dt,x=new WeakMap,p=new Set;let v;const _=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function w(F,T){return E?new OffscreenCanvas(F,T):Kl("canvas")}function M(F,T,ee){let ae=1;const xe=Rt(F);if((xe.width>ee||xe.height>ee)&&(ae=ee/Math.max(xe.width,xe.height)),ae<1)if(typeof HTMLImageElement<"u"&&F instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&F instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&F instanceof ImageBitmap||typeof VideoFrame<"u"&&F instanceof VideoFrame){const Te=Math.floor(ae*xe.width),Ne=Math.floor(ae*xe.height);v===void 0&&(v=w(Te,Ne));const _e=T?w(Te,Ne):v;return _e.width=Te,_e.height=Ne,_e.getContext("2d").drawImage(F,0,0,Te,Ne),lt("WebGLRenderer: Texture has been resized from ("+xe.width+"x"+xe.height+") to ("+Te+"x"+Ne+")."),_e}else return"data"in F&&lt("WebGLRenderer: Image in DataTexture is too big ("+xe.width+"x"+xe.height+")."),F;return F}function S(F){return F.generateMipmaps}function A(F){i.generateMipmap(F)}function L(F){return F.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:F.isWebGL3DRenderTarget?i.TEXTURE_3D:F.isWebGLArrayRenderTarget||F.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(F,T,ee,ae,xe,Te=!1){if(F!==null){if(i[F]!==void 0)return i[F];lt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+F+"'")}let Ne;ae&&(Ne=e.get("EXT_texture_norm16"),Ne||lt("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let _e=T;if(T===i.RED&&(ee===i.FLOAT&&(_e=i.R32F),ee===i.HALF_FLOAT&&(_e=i.R16F),ee===i.UNSIGNED_BYTE&&(_e=i.R8),ee===i.UNSIGNED_SHORT&&Ne&&(_e=Ne.R16_EXT),ee===i.SHORT&&Ne&&(_e=Ne.R16_SNORM_EXT)),T===i.RED_INTEGER&&(ee===i.UNSIGNED_BYTE&&(_e=i.R8UI),ee===i.UNSIGNED_SHORT&&(_e=i.R16UI),ee===i.UNSIGNED_INT&&(_e=i.R32UI),ee===i.BYTE&&(_e=i.R8I),ee===i.SHORT&&(_e=i.R16I),ee===i.INT&&(_e=i.R32I)),T===i.RG&&(ee===i.FLOAT&&(_e=i.RG32F),ee===i.HALF_FLOAT&&(_e=i.RG16F),ee===i.UNSIGNED_BYTE&&(_e=i.RG8),ee===i.UNSIGNED_SHORT&&Ne&&(_e=Ne.RG16_EXT),ee===i.SHORT&&Ne&&(_e=Ne.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(ee===i.UNSIGNED_BYTE&&(_e=i.RG8UI),ee===i.UNSIGNED_SHORT&&(_e=i.RG16UI),ee===i.UNSIGNED_INT&&(_e=i.RG32UI),ee===i.BYTE&&(_e=i.RG8I),ee===i.SHORT&&(_e=i.RG16I),ee===i.INT&&(_e=i.RG32I)),T===i.RGB_INTEGER&&(ee===i.UNSIGNED_BYTE&&(_e=i.RGB8UI),ee===i.UNSIGNED_SHORT&&(_e=i.RGB16UI),ee===i.UNSIGNED_INT&&(_e=i.RGB32UI),ee===i.BYTE&&(_e=i.RGB8I),ee===i.SHORT&&(_e=i.RGB16I),ee===i.INT&&(_e=i.RGB32I)),T===i.RGBA_INTEGER&&(ee===i.UNSIGNED_BYTE&&(_e=i.RGBA8UI),ee===i.UNSIGNED_SHORT&&(_e=i.RGBA16UI),ee===i.UNSIGNED_INT&&(_e=i.RGBA32UI),ee===i.BYTE&&(_e=i.RGBA8I),ee===i.SHORT&&(_e=i.RGBA16I),ee===i.INT&&(_e=i.RGBA32I)),T===i.RGB&&(ee===i.UNSIGNED_SHORT&&Ne&&(_e=Ne.RGB16_EXT),ee===i.SHORT&&Ne&&(_e=Ne.RGB16_SNORM_EXT),ee===i.UNSIGNED_INT_5_9_9_9_REV&&(_e=i.RGB9_E5),ee===i.UNSIGNED_INT_10F_11F_11F_REV&&(_e=i.R11F_G11F_B10F)),T===i.RGBA){const ye=Te?cd:Ct.getTransfer(xe);ee===i.FLOAT&&(_e=i.RGBA32F),ee===i.HALF_FLOAT&&(_e=i.RGBA16F),ee===i.UNSIGNED_BYTE&&(_e=ye===Gt?i.SRGB8_ALPHA8:i.RGBA8),ee===i.UNSIGNED_SHORT&&Ne&&(_e=Ne.RGBA16_EXT),ee===i.SHORT&&Ne&&(_e=Ne.RGBA16_SNORM_EXT),ee===i.UNSIGNED_SHORT_4_4_4_4&&(_e=i.RGBA4),ee===i.UNSIGNED_SHORT_5_5_5_1&&(_e=i.RGB5_A1)}return(_e===i.R16F||_e===i.R32F||_e===i.RG16F||_e===i.RG32F||_e===i.RGBA16F||_e===i.RGBA32F)&&e.get("EXT_color_buffer_float"),_e}function I(F,T){let ee;return F?T===null||T===yr||T===$l?ee=i.DEPTH24_STENCIL8:T===pr?ee=i.DEPTH32F_STENCIL8:T===Xl&&(ee=i.DEPTH24_STENCIL8,lt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===yr||T===$l?ee=i.DEPTH_COMPONENT24:T===pr?ee=i.DEPTH_COMPONENT32F:T===Xl&&(ee=i.DEPTH_COMPONENT16),ee}function N(F,T){return S(F)===!0||F.isFramebufferTexture&&F.minFilter!==Un&&F.minFilter!==jn?Math.log2(Math.max(T.width,T.height))+1:F.mipmaps!==void 0&&F.mipmaps.length>0?F.mipmaps.length:F.isCompressedTexture&&Array.isArray(F.image)?T.mipmaps.length:1}function U(F){const T=F.target;T.removeEventListener("dispose",U),D(T),T.isVideoTexture&&x.delete(T),T.isHTMLTexture&&p.delete(T)}function b(F){const T=F.target;T.removeEventListener("dispose",b),V(T)}function D(F){const T=r.get(F);if(T.__webglInit===void 0)return;const ee=F.source,ae=_.get(ee);if(ae){const xe=ae[T.__cacheKey];xe.usedTimes--,xe.usedTimes===0&&O(F),Object.keys(ae).length===0&&_.delete(ee)}r.remove(F)}function O(F){const T=r.get(F);i.deleteTexture(T.__webglTexture);const ee=F.source,ae=_.get(ee);delete ae[T.__cacheKey],c.memory.textures--}function V(F){const T=r.get(F);if(F.depthTexture&&(F.depthTexture.dispose(),r.remove(F.depthTexture)),F.isWebGLCubeRenderTarget)for(let ae=0;ae<6;ae++){if(Array.isArray(T.__webglFramebuffer[ae]))for(let xe=0;xe<T.__webglFramebuffer[ae].length;xe++)i.deleteFramebuffer(T.__webglFramebuffer[ae][xe]);else i.deleteFramebuffer(T.__webglFramebuffer[ae]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[ae])}else{if(Array.isArray(T.__webglFramebuffer))for(let ae=0;ae<T.__webglFramebuffer.length;ae++)i.deleteFramebuffer(T.__webglFramebuffer[ae]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let ae=0;ae<T.__webglColorRenderbuffer.length;ae++)T.__webglColorRenderbuffer[ae]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[ae]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const ee=F.textures;for(let ae=0,xe=ee.length;ae<xe;ae++){const Te=r.get(ee[ae]);Te.__webglTexture&&(i.deleteTexture(Te.__webglTexture),c.memory.textures--),r.remove(ee[ae])}r.remove(F)}let W=0;function j(){W=0}function ue(){return W}function q(F){W=F}function pe(){const F=W;return F>=a.maxTextures&&lt("WebGLTextures: Trying to use "+F+" texture units while this GPU supports only "+a.maxTextures),W+=1,F}function J(F){const T=[];return T.push(F.wrapS),T.push(F.wrapT),T.push(F.wrapR||0),T.push(F.magFilter),T.push(F.minFilter),T.push(F.anisotropy),T.push(F.internalFormat),T.push(F.format),T.push(F.type),T.push(F.generateMipmaps),T.push(F.premultiplyAlpha),T.push(F.flipY),T.push(F.unpackAlignment),T.push(F.colorSpace),T.join()}function K(F,T){const ee=r.get(F);if(F.isVideoTexture&&Q(F),F.isRenderTargetTexture===!1&&F.isExternalTexture!==!0&&F.version>0&&ee.__version!==F.version){const ae=F.image;if(ae===null)lt("WebGLRenderer: Texture marked for update but no image data found.");else if(ae.complete===!1)lt("WebGLRenderer: Texture marked for update but image is incomplete");else{te(ee,F,T);return}}else F.isExternalTexture&&(ee.__webglTexture=F.sourceTexture?F.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,ee.__webglTexture,i.TEXTURE0+T)}function re(F,T){const ee=r.get(F);if(F.isRenderTargetTexture===!1&&F.version>0&&ee.__version!==F.version){te(ee,F,T);return}else F.isExternalTexture&&(ee.__webglTexture=F.sourceTexture?F.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,ee.__webglTexture,i.TEXTURE0+T)}function he(F,T){const ee=r.get(F);if(F.isRenderTargetTexture===!1&&F.version>0&&ee.__version!==F.version){te(ee,F,T);return}t.bindTexture(i.TEXTURE_3D,ee.__webglTexture,i.TEXTURE0+T)}function z(F,T){const ee=r.get(F);if(F.isCubeDepthTexture!==!0&&F.version>0&&ee.__version!==F.version){Fe(ee,F,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,ee.__webglTexture,i.TEXTURE0+T)}const ie={[Ap]:i.REPEAT,[jr]:i.CLAMP_TO_EDGE,[Pp]:i.MIRRORED_REPEAT},Ie={[Un]:i.NEAREST,[db]:i.NEAREST_MIPMAP_NEAREST,[mu]:i.NEAREST_MIPMAP_LINEAR,[jn]:i.LINEAR,[vf]:i.LINEAR_MIPMAP_NEAREST,[ha]:i.LINEAR_MIPMAP_LINEAR},je={[pb]:i.NEVER,[_b]:i.ALWAYS,[mb]:i.LESS,[Om]:i.LEQUAL,[gb]:i.EQUAL,[zm]:i.GEQUAL,[xb]:i.GREATER,[vb]:i.NOTEQUAL};function He(F,T){if(T.type===pr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===jn||T.magFilter===vf||T.magFilter===mu||T.magFilter===ha||T.minFilter===jn||T.minFilter===vf||T.minFilter===mu||T.minFilter===ha)&&lt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(F,i.TEXTURE_WRAP_S,ie[T.wrapS]),i.texParameteri(F,i.TEXTURE_WRAP_T,ie[T.wrapT]),(F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY)&&i.texParameteri(F,i.TEXTURE_WRAP_R,ie[T.wrapR]),i.texParameteri(F,i.TEXTURE_MAG_FILTER,Ie[T.magFilter]),i.texParameteri(F,i.TEXTURE_MIN_FILTER,Ie[T.minFilter]),T.compareFunction&&(i.texParameteri(F,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(F,i.TEXTURE_COMPARE_FUNC,je[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Un||T.minFilter!==mu&&T.minFilter!==ha||T.type===pr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const ee=e.get("EXT_texture_filter_anisotropic");i.texParameterf(F,ee.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function H(F,T){let ee=!1;F.__webglInit===void 0&&(F.__webglInit=!0,T.addEventListener("dispose",U));const ae=T.source;let xe=_.get(ae);xe===void 0&&(xe={},_.set(ae,xe));const Te=J(T);if(Te!==F.__cacheKey){xe[Te]===void 0&&(xe[Te]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,ee=!0),xe[Te].usedTimes++;const Ne=xe[F.__cacheKey];Ne!==void 0&&(xe[F.__cacheKey].usedTimes--,Ne.usedTimes===0&&O(T)),F.__cacheKey=Te,F.__webglTexture=xe[Te].texture}return ee}function ve(F,T,ee){return Math.floor(Math.floor(F/ee)/T)}function fe(F,T,ee,ae){const Te=F.updateRanges;if(Te.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,ee,ae,T.data);else{Te.sort((Ue,Ce)=>Ue.start-Ce.start);let Ne=0;for(let Ue=1;Ue<Te.length;Ue++){const Ce=Te[Ne],Ae=Te[Ue],Je=Ce.start+Ce.count,it=ve(Ae.start,T.width,4),st=ve(Ce.start,T.width,4);Ae.start<=Je+1&&it===st&&ve(Ae.start+Ae.count-1,T.width,4)===it?Ce.count=Math.max(Ce.count,Ae.start+Ae.count-Ce.start):(++Ne,Te[Ne]=Ae)}Te.length=Ne+1;const _e=t.getParameter(i.UNPACK_ROW_LENGTH),ye=t.getParameter(i.UNPACK_SKIP_PIXELS),de=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let Ue=0,Ce=Te.length;Ue<Ce;Ue++){const Ae=Te[Ue],Je=Math.floor(Ae.start/4),it=Math.ceil(Ae.count/4),st=Je%T.width,$=Math.floor(Je/T.width),Le=it,Se=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,st),t.pixelStorei(i.UNPACK_SKIP_ROWS,$),t.texSubImage2D(i.TEXTURE_2D,0,st,$,Le,Se,ee,ae,T.data)}F.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,_e),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ye),t.pixelStorei(i.UNPACK_SKIP_ROWS,de)}}function te(F,T,ee){let ae=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(ae=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(ae=i.TEXTURE_3D);const xe=H(F,T),Te=T.source;t.bindTexture(ae,F.__webglTexture,i.TEXTURE0+ee);const Ne=r.get(Te);if(Te.version!==Ne.__version||xe===!0){if(t.activeTexture(i.TEXTURE0+ee),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const Se=Ct.getPrimaries(Ct.workingColorSpace),ke=T.colorSpace===Ts?null:Ct.getPrimaries(T.colorSpace),Oe=T.colorSpace===Ts||Se===ke?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Oe)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let ye=M(T.image,!1,a.maxTextureSize);ye=mn(T,ye);const de=l.convert(T.format,T.colorSpace),Ue=l.convert(T.type);let Ce=C(T.internalFormat,de,Ue,T.normalized,T.colorSpace,T.isVideoTexture);He(ae,T);let Ae;const Je=T.mipmaps,it=T.isVideoTexture!==!0,st=Ne.__version===void 0||xe===!0,$=Te.dataReady,Le=N(T,ye);if(T.isDepthTexture)Ce=I(T.format===fa,T.type),st&&(it?t.texStorage2D(i.TEXTURE_2D,1,Ce,ye.width,ye.height):t.texImage2D(i.TEXTURE_2D,0,Ce,ye.width,ye.height,0,de,Ue,null));else if(T.isDataTexture)if(Je.length>0){it&&st&&t.texStorage2D(i.TEXTURE_2D,Le,Ce,Je[0].width,Je[0].height);for(let Se=0,ke=Je.length;Se<ke;Se++)Ae=Je[Se],it?$&&t.texSubImage2D(i.TEXTURE_2D,Se,0,0,Ae.width,Ae.height,de,Ue,Ae.data):t.texImage2D(i.TEXTURE_2D,Se,Ce,Ae.width,Ae.height,0,de,Ue,Ae.data);T.generateMipmaps=!1}else it?(st&&t.texStorage2D(i.TEXTURE_2D,Le,Ce,ye.width,ye.height),$&&fe(T,ye,de,Ue)):t.texImage2D(i.TEXTURE_2D,0,Ce,ye.width,ye.height,0,de,Ue,ye.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){it&&st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Le,Ce,Je[0].width,Je[0].height,ye.depth);for(let Se=0,ke=Je.length;Se<ke;Se++)if(Ae=Je[Se],T.format!==Ki)if(de!==null)if(it){if($)if(T.layerUpdates.size>0){const Oe=Pv(Ae.width,Ae.height,T.format,T.type);for(const Me of T.layerUpdates){const Ye=Ae.data.subarray(Me*Oe/Ae.data.BYTES_PER_ELEMENT,(Me+1)*Oe/Ae.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Se,0,0,Me,Ae.width,Ae.height,1,de,Ye)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Se,0,0,0,Ae.width,Ae.height,ye.depth,de,Ae.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Se,Ce,Ae.width,Ae.height,ye.depth,0,Ae.data,0,0);else lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else it?$&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,Se,0,0,0,Ae.width,Ae.height,ye.depth,de,Ue,Ae.data):t.texImage3D(i.TEXTURE_2D_ARRAY,Se,Ce,Ae.width,Ae.height,ye.depth,0,de,Ue,Ae.data)}else{it&&st&&t.texStorage2D(i.TEXTURE_2D,Le,Ce,Je[0].width,Je[0].height);for(let Se=0,ke=Je.length;Se<ke;Se++)Ae=Je[Se],T.format!==Ki?de!==null?it?$&&t.compressedTexSubImage2D(i.TEXTURE_2D,Se,0,0,Ae.width,Ae.height,de,Ae.data):t.compressedTexImage2D(i.TEXTURE_2D,Se,Ce,Ae.width,Ae.height,0,Ae.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):it?$&&t.texSubImage2D(i.TEXTURE_2D,Se,0,0,Ae.width,Ae.height,de,Ue,Ae.data):t.texImage2D(i.TEXTURE_2D,Se,Ce,Ae.width,Ae.height,0,de,Ue,Ae.data)}else if(T.isDataArrayTexture)if(it){if(st&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Le,Ce,ye.width,ye.height,ye.depth),$)if(T.layerUpdates.size>0){const Se=Pv(ye.width,ye.height,T.format,T.type);for(const ke of T.layerUpdates){const Oe=ye.data.subarray(ke*Se/ye.data.BYTES_PER_ELEMENT,(ke+1)*Se/ye.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ke,ye.width,ye.height,1,de,Ue,Oe)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ye.width,ye.height,ye.depth,de,Ue,ye.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Ce,ye.width,ye.height,ye.depth,0,de,Ue,ye.data);else if(T.isData3DTexture)it?(st&&t.texStorage3D(i.TEXTURE_3D,Le,Ce,ye.width,ye.height,ye.depth),$&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ye.width,ye.height,ye.depth,de,Ue,ye.data)):t.texImage3D(i.TEXTURE_3D,0,Ce,ye.width,ye.height,ye.depth,0,de,Ue,ye.data);else if(T.isFramebufferTexture){if(st)if(it)t.texStorage2D(i.TEXTURE_2D,Le,Ce,ye.width,ye.height);else{let Se=ye.width,ke=ye.height;for(let Oe=0;Oe<Le;Oe++)t.texImage2D(i.TEXTURE_2D,Oe,Ce,Se,ke,0,de,Ue,null),Se>>=1,ke>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const Se=i.canvas;if(Se.hasAttribute("layoutsubtree")||Se.setAttribute("layoutsubtree","true"),ye.parentNode!==Se){Se.appendChild(ye),p.add(T),Se.onpaint=ke=>{const Oe=ke.changedElements;for(const Me of p)Oe.includes(Me.image)&&(Me.needsUpdate=!0)},Se.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ye);else{const Oe=i.RGBA,Me=i.RGBA,Ye=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Oe,Me,Ye,ye)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Je.length>0){if(it&&st){const Se=Rt(Je[0]);t.texStorage2D(i.TEXTURE_2D,Le,Ce,Se.width,Se.height)}for(let Se=0,ke=Je.length;Se<ke;Se++)Ae=Je[Se],it?$&&t.texSubImage2D(i.TEXTURE_2D,Se,0,0,de,Ue,Ae):t.texImage2D(i.TEXTURE_2D,Se,Ce,de,Ue,Ae);T.generateMipmaps=!1}else if(it){if(st){const Se=Rt(ye);t.texStorage2D(i.TEXTURE_2D,Le,Ce,Se.width,Se.height)}$&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,de,Ue,ye)}else t.texImage2D(i.TEXTURE_2D,0,Ce,de,Ue,ye);S(T)&&A(ae),Ne.__version=Te.version,T.onUpdate&&T.onUpdate(T)}F.__version=T.version}function Fe(F,T,ee){if(T.image.length!==6)return;const ae=H(F,T),xe=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,F.__webglTexture,i.TEXTURE0+ee);const Te=r.get(xe);if(xe.version!==Te.__version||ae===!0){t.activeTexture(i.TEXTURE0+ee);const Ne=Ct.getPrimaries(Ct.workingColorSpace),_e=T.colorSpace===Ts?null:Ct.getPrimaries(T.colorSpace),ye=T.colorSpace===Ts||Ne===_e?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ye);const de=T.isCompressedTexture||T.image[0].isCompressedTexture,Ue=T.image[0]&&T.image[0].isDataTexture,Ce=[];for(let Me=0;Me<6;Me++)!de&&!Ue?Ce[Me]=M(T.image[Me],!0,a.maxCubemapSize):Ce[Me]=Ue?T.image[Me].image:T.image[Me],Ce[Me]=mn(T,Ce[Me]);const Ae=Ce[0],Je=l.convert(T.format,T.colorSpace),it=l.convert(T.type),st=C(T.internalFormat,Je,it,T.normalized,T.colorSpace),$=T.isVideoTexture!==!0,Le=Te.__version===void 0||ae===!0,Se=xe.dataReady;let ke=N(T,Ae);He(i.TEXTURE_CUBE_MAP,T);let Oe;if(de){$&&Le&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ke,st,Ae.width,Ae.height);for(let Me=0;Me<6;Me++){Oe=Ce[Me].mipmaps;for(let Ye=0;Ye<Oe.length;Ye++){const qe=Oe[Ye];T.format!==Ki?Je!==null?$?Se&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,0,0,qe.width,qe.height,Je,qe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,st,qe.width,qe.height,0,qe.data):lt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):$?Se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,0,0,qe.width,qe.height,Je,it,qe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye,st,qe.width,qe.height,0,Je,it,qe.data)}}}else{if(Oe=T.mipmaps,$&&Le){Oe.length>0&&ke++;const Me=Rt(Ce[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ke,st,Me.width,Me.height)}for(let Me=0;Me<6;Me++)if(Ue){$?Se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,Ce[Me].width,Ce[Me].height,Je,it,Ce[Me].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,Ce[Me].width,Ce[Me].height,0,Je,it,Ce[Me].data);for(let Ye=0;Ye<Oe.length;Ye++){const Wt=Oe[Ye].image[Me].image;$?Se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,0,0,Wt.width,Wt.height,Je,it,Wt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,st,Wt.width,Wt.height,0,Je,it,Wt.data)}}else{$?Se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,0,0,Je,it,Ce[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,0,st,Je,it,Ce[Me]);for(let Ye=0;Ye<Oe.length;Ye++){const qe=Oe[Ye];$?Se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,0,0,Je,it,qe.image[Me]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Me,Ye+1,st,Je,it,qe.image[Me])}}}S(T)&&A(i.TEXTURE_CUBE_MAP),Te.__version=xe.version,T.onUpdate&&T.onUpdate(T)}F.__version=T.version}function Xe(F,T,ee,ae,xe,Te){const Ne=l.convert(ee.format,ee.colorSpace),_e=l.convert(ee.type),ye=C(ee.internalFormat,Ne,_e,ee.normalized,ee.colorSpace),de=r.get(T),Ue=r.get(ee);if(Ue.__renderTarget=T,!de.__hasExternalTextures){const Ce=Math.max(1,T.width>>Te),Ae=Math.max(1,T.height>>Te);xe===i.TEXTURE_3D||xe===i.TEXTURE_2D_ARRAY?t.texImage3D(xe,Te,ye,Ce,Ae,T.depth,0,Ne,_e,null):t.texImage2D(xe,Te,ye,Ce,Ae,0,Ne,_e,null)}t.bindFramebuffer(i.FRAMEBUFFER,F),Yt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ae,xe,Ue.__webglTexture,0,It(T)):(xe===i.TEXTURE_2D||xe>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&xe<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,ae,xe,Ue.__webglTexture,Te),t.bindFramebuffer(i.FRAMEBUFFER,null)}function kt(F,T,ee){if(i.bindRenderbuffer(i.RENDERBUFFER,F),T.depthBuffer){const ae=T.depthTexture,xe=ae&&ae.isDepthTexture?ae.type:null,Te=I(T.stencilBuffer,xe),Ne=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Yt(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,It(T),Te,T.width,T.height):ee?i.renderbufferStorageMultisample(i.RENDERBUFFER,It(T),Te,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,Te,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,Ne,i.RENDERBUFFER,F)}else{const ae=T.textures;for(let xe=0;xe<ae.length;xe++){const Te=ae[xe],Ne=l.convert(Te.format,Te.colorSpace),_e=l.convert(Te.type),ye=C(Te.internalFormat,Ne,_e,Te.normalized,Te.colorSpace);Yt(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,It(T),ye,T.width,T.height):ee?i.renderbufferStorageMultisample(i.RENDERBUFFER,It(T),ye,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,ye,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function ct(F,T,ee){const ae=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,F),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const xe=r.get(T.depthTexture);if(xe.__renderTarget=T,(!xe.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),ae){if(xe.__webglInit===void 0&&(xe.__webglInit=!0,T.depthTexture.addEventListener("dispose",U)),xe.__webglTexture===void 0){xe.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,xe.__webglTexture),He(i.TEXTURE_CUBE_MAP,T.depthTexture);const de=l.convert(T.depthTexture.format),Ue=l.convert(T.depthTexture.type);let Ce;T.depthTexture.format===Yr?Ce=i.DEPTH_COMPONENT24:T.depthTexture.format===fa&&(Ce=i.DEPTH24_STENCIL8);for(let Ae=0;Ae<6;Ae++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ae,0,Ce,T.width,T.height,0,de,Ue,null)}}else K(T.depthTexture,0);const Te=xe.__webglTexture,Ne=It(T),_e=ae?i.TEXTURE_CUBE_MAP_POSITIVE_X+ee:i.TEXTURE_2D,ye=T.depthTexture.format===fa?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===Yr)Yt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ye,_e,Te,0,Ne):i.framebufferTexture2D(i.FRAMEBUFFER,ye,_e,Te,0);else if(T.depthTexture.format===fa)Yt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ye,_e,Te,0,Ne):i.framebufferTexture2D(i.FRAMEBUFFER,ye,_e,Te,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Nt(F){const T=r.get(F),ee=F.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==F.depthTexture){const ae=F.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),ae){const xe=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,ae.removeEventListener("dispose",xe)};ae.addEventListener("dispose",xe),T.__depthDisposeCallback=xe}T.__boundDepthTexture=ae}if(F.depthTexture&&!T.__autoAllocateDepthBuffer)if(ee)for(let ae=0;ae<6;ae++)ct(T.__webglFramebuffer[ae],F,ae);else{const ae=F.texture.mipmaps;ae&&ae.length>0?ct(T.__webglFramebuffer[0],F,0):ct(T.__webglFramebuffer,F,0)}else if(ee){T.__webglDepthbuffer=[];for(let ae=0;ae<6;ae++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[ae]),T.__webglDepthbuffer[ae]===void 0)T.__webglDepthbuffer[ae]=i.createRenderbuffer(),kt(T.__webglDepthbuffer[ae],F,!1);else{const xe=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=T.__webglDepthbuffer[ae];i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,xe,i.RENDERBUFFER,Te)}}else{const ae=F.texture.mipmaps;if(ae&&ae.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),kt(T.__webglDepthbuffer,F,!1);else{const xe=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Te=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,Te),i.framebufferRenderbuffer(i.FRAMEBUFFER,xe,i.RENDERBUFFER,Te)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function bt(F,T,ee){const ae=r.get(F);T!==void 0&&Xe(ae.__webglFramebuffer,F,F.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),ee!==void 0&&Nt(F)}function yt(F){const T=F.texture,ee=r.get(F),ae=r.get(T);F.addEventListener("dispose",b);const xe=F.textures,Te=F.isWebGLCubeRenderTarget===!0,Ne=xe.length>1;if(Ne||(ae.__webglTexture===void 0&&(ae.__webglTexture=i.createTexture()),ae.__version=T.version,c.memory.textures++),Te){ee.__webglFramebuffer=[];for(let _e=0;_e<6;_e++)if(T.mipmaps&&T.mipmaps.length>0){ee.__webglFramebuffer[_e]=[];for(let ye=0;ye<T.mipmaps.length;ye++)ee.__webglFramebuffer[_e][ye]=i.createFramebuffer()}else ee.__webglFramebuffer[_e]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){ee.__webglFramebuffer=[];for(let _e=0;_e<T.mipmaps.length;_e++)ee.__webglFramebuffer[_e]=i.createFramebuffer()}else ee.__webglFramebuffer=i.createFramebuffer();if(Ne)for(let _e=0,ye=xe.length;_e<ye;_e++){const de=r.get(xe[_e]);de.__webglTexture===void 0&&(de.__webglTexture=i.createTexture(),c.memory.textures++)}if(F.samples>0&&Yt(F)===!1){ee.__webglMultisampledFramebuffer=i.createFramebuffer(),ee.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,ee.__webglMultisampledFramebuffer);for(let _e=0;_e<xe.length;_e++){const ye=xe[_e];ee.__webglColorRenderbuffer[_e]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,ee.__webglColorRenderbuffer[_e]);const de=l.convert(ye.format,ye.colorSpace),Ue=l.convert(ye.type),Ce=C(ye.internalFormat,de,Ue,ye.normalized,ye.colorSpace,F.isXRRenderTarget===!0),Ae=It(F);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ae,Ce,F.width,F.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+_e,i.RENDERBUFFER,ee.__webglColorRenderbuffer[_e])}i.bindRenderbuffer(i.RENDERBUFFER,null),F.depthBuffer&&(ee.__webglDepthRenderbuffer=i.createRenderbuffer(),kt(ee.__webglDepthRenderbuffer,F,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(Te){t.bindTexture(i.TEXTURE_CUBE_MAP,ae.__webglTexture),He(i.TEXTURE_CUBE_MAP,T);for(let _e=0;_e<6;_e++)if(T.mipmaps&&T.mipmaps.length>0)for(let ye=0;ye<T.mipmaps.length;ye++)Xe(ee.__webglFramebuffer[_e][ye],F,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,ye);else Xe(ee.__webglFramebuffer[_e],F,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+_e,0);S(T)&&A(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ne){for(let _e=0,ye=xe.length;_e<ye;_e++){const de=xe[_e],Ue=r.get(de);let Ce=i.TEXTURE_2D;(F.isWebGL3DRenderTarget||F.isWebGLArrayRenderTarget)&&(Ce=F.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Ce,Ue.__webglTexture),He(Ce,de),Xe(ee.__webglFramebuffer,F,de,i.COLOR_ATTACHMENT0+_e,Ce,0),S(de)&&A(Ce)}t.unbindTexture()}else{let _e=i.TEXTURE_2D;if((F.isWebGL3DRenderTarget||F.isWebGLArrayRenderTarget)&&(_e=F.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(_e,ae.__webglTexture),He(_e,T),T.mipmaps&&T.mipmaps.length>0)for(let ye=0;ye<T.mipmaps.length;ye++)Xe(ee.__webglFramebuffer[ye],F,T,i.COLOR_ATTACHMENT0,_e,ye);else Xe(ee.__webglFramebuffer,F,T,i.COLOR_ATTACHMENT0,_e,0);S(T)&&A(_e),t.unbindTexture()}F.depthBuffer&&Nt(F)}function qt(F){const T=F.textures;for(let ee=0,ae=T.length;ee<ae;ee++){const xe=T[ee];if(S(xe)){const Te=L(F),Ne=r.get(xe).__webglTexture;t.bindTexture(Te,Ne),A(Te),t.unbindTexture()}}}const nn=[],jt=[];function Kt(F){if(F.samples>0){if(Yt(F)===!1){const T=F.textures,ee=F.width,ae=F.height;let xe=i.COLOR_BUFFER_BIT;const Te=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,Ne=r.get(F),_e=T.length>1;if(_e)for(let de=0;de<T.length;de++)t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,Ne.__webglMultisampledFramebuffer);const ye=F.texture.mipmaps;ye&&ye.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ne.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ne.__webglFramebuffer);for(let de=0;de<T.length;de++){if(F.resolveDepthBuffer&&(F.depthBuffer&&(xe|=i.DEPTH_BUFFER_BIT),F.stencilBuffer&&F.resolveStencilBuffer&&(xe|=i.STENCIL_BUFFER_BIT)),_e){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,Ne.__webglColorRenderbuffer[de]);const Ue=r.get(T[de]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ue,0)}i.blitFramebuffer(0,0,ee,ae,0,0,ee,ae,xe,i.NEAREST),h===!0&&(nn.length=0,jt.length=0,nn.push(i.COLOR_ATTACHMENT0+de),F.depthBuffer&&F.resolveDepthBuffer===!1&&(nn.push(Te),jt.push(Te),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,jt)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,nn))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),_e)for(let de=0;de<T.length;de++){t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.RENDERBUFFER,Ne.__webglColorRenderbuffer[de]);const Ue=r.get(T[de]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,Ne.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+de,i.TEXTURE_2D,Ue,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,Ne.__webglMultisampledFramebuffer)}else if(F.depthBuffer&&F.resolveDepthBuffer===!1&&h){const T=F.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function It(F){return Math.min(a.maxSamples,F.samples)}function Yt(F){const T=r.get(F);return F.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Q(F){const T=c.render.frame;x.get(F)!==T&&(x.set(F,T),F.update())}function mn(F,T){const ee=F.colorSpace,ae=F.format,xe=F.type;return F.isCompressedTexture===!0||F.isVideoTexture===!0||ee!==ld&&ee!==Ts&&(Ct.getTransfer(ee)===Gt?(ae!==Ki||xe!==Si)&&lt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Dt("WebGLTextures: Unsupported texture color space:",ee)),T}function Rt(F){return typeof HTMLImageElement<"u"&&F instanceof HTMLImageElement?(f.width=F.naturalWidth||F.width,f.height=F.naturalHeight||F.height):typeof VideoFrame<"u"&&F instanceof VideoFrame?(f.width=F.displayWidth,f.height=F.displayHeight):(f.width=F.width,f.height=F.height),f}this.allocateTextureUnit=pe,this.resetTextureUnits=j,this.getTextureUnits=ue,this.setTextureUnits=q,this.setTexture2D=K,this.setTexture2DArray=re,this.setTexture3D=he,this.setTextureCube=z,this.rebindTextures=bt,this.setupRenderTarget=yt,this.updateRenderTargetMipmap=qt,this.updateMultisampleRenderTarget=Kt,this.setupDepthRenderbuffer=Nt,this.setupFrameBufferTexture=Xe,this.useMultisampledRTT=Yt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function iP(i,e){function t(r,a=Ts){let l;const c=Ct.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Dm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Im)return i.UNSIGNED_SHORT_5_5_5_1;if(r===xy)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===vy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===my)return i.BYTE;if(r===gy)return i.SHORT;if(r===Xl)return i.UNSIGNED_SHORT;if(r===Lm)return i.INT;if(r===yr)return i.UNSIGNED_INT;if(r===pr)return i.FLOAT;if(r===Kr)return i.HALF_FLOAT;if(r===_y)return i.ALPHA;if(r===yy)return i.RGB;if(r===Ki)return i.RGBA;if(r===Yr)return i.DEPTH_COMPONENT;if(r===fa)return i.DEPTH_STENCIL;if(r===Sy)return i.RED;if(r===Um)return i.RED_INTEGER;if(r===Ta)return i.RG;if(r===Fm)return i.RG_INTEGER;if(r===km)return i.RGBA_INTEGER;if(r===$u||r===qu||r===Ku||r===Yu)if(c===Gt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===$u)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Yu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===$u)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===Ku)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Yu)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Np||r===Lp||r===Dp||r===Ip)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Np)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Lp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Dp)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Ip)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Up||r===Fp||r===kp||r===Op||r===zp||r===sd||r===Bp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Up||r===Fp)return c===Gt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===kp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Op)return l.COMPRESSED_R11_EAC;if(r===zp)return l.COMPRESSED_SIGNED_R11_EAC;if(r===sd)return l.COMPRESSED_RG11_EAC;if(r===Bp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===Hp||r===Vp||r===Gp||r===jp||r===Wp||r===Xp||r===$p||r===qp||r===Kp||r===Yp||r===Qp||r===Zp||r===Jp||r===em)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===Hp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Vp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Gp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===jp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Wp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===Xp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===$p)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===qp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Kp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Yp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Qp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Zp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===Jp)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===em)return c===Gt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===tm||r===nm||r===im)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===tm)return c===Gt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===nm)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===im)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===rm||r===sm||r===ad||r===am)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===rm)return l.COMPRESSED_RED_RGTC1_EXT;if(r===sm)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===ad)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===am)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===$l?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const rP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,sP=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class aP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new Py(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new Mr({vertexShader:rP,fragmentShader:sP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Qi(new Ed(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class oP extends Bs{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,x=null,p=null,v=null,_=null,E=null;const w=typeof XRWebGLBinding<"u",M=new aP,S={},A=t.getContextAttributes();let L=null,C=null;const I=[],N=[],U=new dt;let b=null;const D=new Ii;D.viewport=new dn;const O=new Ii;O.viewport=new dn;const V=[D,O],W=new gT;let j=null,ue=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(H){let ve=I[H];return ve===void 0&&(ve=new bf,I[H]=ve),ve.getTargetRaySpace()},this.getControllerGrip=function(H){let ve=I[H];return ve===void 0&&(ve=new bf,I[H]=ve),ve.getGripSpace()},this.getHand=function(H){let ve=I[H];return ve===void 0&&(ve=new bf,I[H]=ve),ve.getHandSpace()};function q(H){const ve=N.indexOf(H.inputSource);if(ve===-1)return;const fe=I[ve];fe!==void 0&&(fe.update(H.inputSource,H.frame,f||c),fe.dispatchEvent({type:H.type,data:H.inputSource}))}function pe(){a.removeEventListener("select",q),a.removeEventListener("selectstart",q),a.removeEventListener("selectend",q),a.removeEventListener("squeeze",q),a.removeEventListener("squeezestart",q),a.removeEventListener("squeezeend",q),a.removeEventListener("end",pe),a.removeEventListener("inputsourceschange",J);for(let H=0;H<I.length;H++){const ve=N[H];ve!==null&&(N[H]=null,I[H].disconnect(ve))}j=null,ue=null,M.reset();for(const H in S)delete S[H];e.setRenderTarget(L),_=null,v=null,p=null,a=null,C=null,He.stop(),r.isPresenting=!1,e.setPixelRatio(b),e.setSize(U.width,U.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(H){l=H,r.isPresenting===!0&&lt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(H){d=H,r.isPresenting===!0&&lt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(H){f=H},this.getBaseLayer=function(){return v!==null?v:_},this.getBinding=function(){return p===null&&w&&(p=new XRWebGLBinding(a,t)),p},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(H){if(a=H,a!==null){if(L=e.getRenderTarget(),a.addEventListener("select",q),a.addEventListener("selectstart",q),a.addEventListener("selectend",q),a.addEventListener("squeeze",q),a.addEventListener("squeezestart",q),a.addEventListener("squeezeend",q),a.addEventListener("end",pe),a.addEventListener("inputsourceschange",J),A.xrCompatible!==!0&&await t.makeXRCompatible(),b=e.getPixelRatio(),e.getSize(U),w&&"createProjectionLayer"in XRWebGLBinding.prototype){let fe=null,te=null,Fe=null;A.depth&&(Fe=A.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,fe=A.stencil?fa:Yr,te=A.stencil?$l:yr);const Xe={colorFormat:t.RGBA8,depthFormat:Fe,scaleFactor:l};p=this.getBinding(),v=p.createProjectionLayer(Xe),a.updateRenderState({layers:[v]}),e.setPixelRatio(1),e.setSize(v.textureWidth,v.textureHeight,!1),C=new vr(v.textureWidth,v.textureHeight,{format:Ki,type:Si,depthTexture:new Fo(v.textureWidth,v.textureHeight,te,void 0,void 0,void 0,void 0,void 0,void 0,fe),stencilBuffer:A.stencil,colorSpace:e.outputColorSpace,samples:A.antialias?4:0,resolveDepthBuffer:v.ignoreDepthValues===!1,resolveStencilBuffer:v.ignoreDepthValues===!1})}else{const fe={antialias:A.antialias,alpha:!0,depth:A.depth,stencil:A.stencil,framebufferScaleFactor:l};_=new XRWebGLLayer(a,t,fe),a.updateRenderState({baseLayer:_}),e.setPixelRatio(1),e.setSize(_.framebufferWidth,_.framebufferHeight,!1),C=new vr(_.framebufferWidth,_.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:A.stencil,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),He.setContext(a),He.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return M.getDepthTexture()};function J(H){for(let ve=0;ve<H.removed.length;ve++){const fe=H.removed[ve],te=N.indexOf(fe);te>=0&&(N[te]=null,I[te].disconnect(fe))}for(let ve=0;ve<H.added.length;ve++){const fe=H.added[ve];let te=N.indexOf(fe);if(te===-1){for(let Xe=0;Xe<I.length;Xe++)if(Xe>=N.length){N.push(fe),te=Xe;break}else if(N[Xe]===null){N[Xe]=fe,te=Xe;break}if(te===-1)break}const Fe=I[te];Fe&&Fe.connect(fe)}}const K=new ne,re=new ne;function he(H,ve,fe){K.setFromMatrixPosition(ve.matrixWorld),re.setFromMatrixPosition(fe.matrixWorld);const te=K.distanceTo(re),Fe=ve.projectionMatrix.elements,Xe=fe.projectionMatrix.elements,kt=Fe[14]/(Fe[10]-1),ct=Fe[14]/(Fe[10]+1),Nt=(Fe[9]+1)/Fe[5],bt=(Fe[9]-1)/Fe[5],yt=(Fe[8]-1)/Fe[0],qt=(Xe[8]+1)/Xe[0],nn=kt*yt,jt=kt*qt,Kt=te/(-yt+qt),It=Kt*-yt;if(ve.matrixWorld.decompose(H.position,H.quaternion,H.scale),H.translateX(It),H.translateZ(Kt),H.matrixWorld.compose(H.position,H.quaternion,H.scale),H.matrixWorldInverse.copy(H.matrixWorld).invert(),Fe[10]===-1)H.projectionMatrix.copy(ve.projectionMatrix),H.projectionMatrixInverse.copy(ve.projectionMatrixInverse);else{const Yt=kt+Kt,Q=ct+Kt,mn=nn-It,Rt=jt+(te-It),F=Nt*ct/Q*Yt,T=bt*ct/Q*Yt;H.projectionMatrix.makePerspective(mn,Rt,F,T,Yt,Q),H.projectionMatrixInverse.copy(H.projectionMatrix).invert()}}function z(H,ve){ve===null?H.matrixWorld.copy(H.matrix):H.matrixWorld.multiplyMatrices(ve.matrixWorld,H.matrix),H.matrixWorldInverse.copy(H.matrixWorld).invert()}this.updateCamera=function(H){if(a===null)return;let ve=H.near,fe=H.far;M.texture!==null&&(M.depthNear>0&&(ve=M.depthNear),M.depthFar>0&&(fe=M.depthFar)),W.near=O.near=D.near=ve,W.far=O.far=D.far=fe,(j!==W.near||ue!==W.far)&&(a.updateRenderState({depthNear:W.near,depthFar:W.far}),j=W.near,ue=W.far),W.layers.mask=H.layers.mask|6,D.layers.mask=W.layers.mask&-5,O.layers.mask=W.layers.mask&-3;const te=H.parent,Fe=W.cameras;z(W,te);for(let Xe=0;Xe<Fe.length;Xe++)z(Fe[Xe],te);Fe.length===2?he(W,D,O):W.projectionMatrix.copy(D.projectionMatrix),ie(H,W,te)};function ie(H,ve,fe){fe===null?H.matrix.copy(ve.matrixWorld):(H.matrix.copy(fe.matrixWorld),H.matrix.invert(),H.matrix.multiply(ve.matrixWorld)),H.matrix.decompose(H.position,H.quaternion,H.scale),H.updateMatrixWorld(!0),H.projectionMatrix.copy(ve.projectionMatrix),H.projectionMatrixInverse.copy(ve.projectionMatrixInverse),H.isPerspectiveCamera&&(H.fov=om*2*Math.atan(1/H.projectionMatrix.elements[5]),H.zoom=1)}this.getCamera=function(){return W},this.getFoveation=function(){if(!(v===null&&_===null))return h},this.setFoveation=function(H){h=H,v!==null&&(v.fixedFoveation=H),_!==null&&_.fixedFoveation!==void 0&&(_.fixedFoveation=H)},this.hasDepthSensing=function(){return M.texture!==null},this.getDepthSensingMesh=function(){return M.getMesh(W)},this.getCameraTexture=function(H){return S[H]};let Ie=null;function je(H,ve){if(x=ve.getViewerPose(f||c),E=ve,x!==null){const fe=x.views;_!==null&&(e.setRenderTargetFramebuffer(C,_.framebuffer),e.setRenderTarget(C));let te=!1;fe.length!==W.cameras.length&&(W.cameras.length=0,te=!0);for(let ct=0;ct<fe.length;ct++){const Nt=fe[ct];let bt=null;if(_!==null)bt=_.getViewport(Nt);else{const qt=p.getViewSubImage(v,Nt);bt=qt.viewport,ct===0&&(e.setRenderTargetTextures(C,qt.colorTexture,qt.depthStencilTexture),e.setRenderTarget(C))}let yt=V[ct];yt===void 0&&(yt=new Ii,yt.layers.enable(ct),yt.viewport=new dn,V[ct]=yt),yt.matrix.fromArray(Nt.transform.matrix),yt.matrix.decompose(yt.position,yt.quaternion,yt.scale),yt.projectionMatrix.fromArray(Nt.projectionMatrix),yt.projectionMatrixInverse.copy(yt.projectionMatrix).invert(),yt.viewport.set(bt.x,bt.y,bt.width,bt.height),ct===0&&(W.matrix.copy(yt.matrix),W.matrix.decompose(W.position,W.quaternion,W.scale)),te===!0&&W.cameras.push(yt)}const Fe=a.enabledFeatures;if(Fe&&Fe.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&w){p=r.getBinding();const ct=p.getDepthInformation(fe[0]);ct&&ct.isValid&&ct.texture&&M.init(ct,a.renderState)}if(Fe&&Fe.includes("camera-access")&&w){e.state.unbindTexture(),p=r.getBinding();for(let ct=0;ct<fe.length;ct++){const Nt=fe[ct].camera;if(Nt){let bt=S[Nt];bt||(bt=new Py,S[Nt]=bt);const yt=p.getCameraImage(Nt);bt.sourceTexture=yt}}}}for(let fe=0;fe<I.length;fe++){const te=N[fe],Fe=I[fe];te!==null&&Fe!==void 0&&Fe.update(te,ve,f||c)}Ie&&Ie(H,ve),ve.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:ve}),E=null}const He=new Dy;He.setAnimationLoop(je),this.setAnimationLoop=function(H){Ie=H},this.dispose=function(){}}}const lP=new on,By=new pt;By.set(-1,0,0,0,1,0,0,0,1);function cP(i,e){function t(M,S){M.matrixAutoUpdate===!0&&M.updateMatrix(),S.value.copy(M.matrix)}function r(M,S){S.color.getRGB(M.fogColor.value,Ny(i)),S.isFog?(M.fogNear.value=S.near,M.fogFar.value=S.far):S.isFogExp2&&(M.fogDensity.value=S.density)}function a(M,S,A,L,C){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?l(M,S):S.isMeshLambertMaterial?(l(M,S),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(l(M,S),p(M,S)):S.isMeshPhongMaterial?(l(M,S),x(M,S),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(l(M,S),v(M,S),S.isMeshPhysicalMaterial&&_(M,S,C)):S.isMeshMatcapMaterial?(l(M,S),E(M,S)):S.isMeshDepthMaterial?l(M,S):S.isMeshDistanceMaterial?(l(M,S),w(M,S)):S.isMeshNormalMaterial?l(M,S):S.isLineBasicMaterial?(c(M,S),S.isLineDashedMaterial&&d(M,S)):S.isPointsMaterial?h(M,S,A,L):S.isSpriteMaterial?f(M,S):S.isShadowMaterial?(M.color.value.copy(S.color),M.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function l(M,S){M.opacity.value=S.opacity,S.color&&M.diffuse.value.copy(S.color),S.emissive&&M.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(M.map.value=S.map,t(S.map,M.mapTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.bumpMap&&(M.bumpMap.value=S.bumpMap,t(S.bumpMap,M.bumpMapTransform),M.bumpScale.value=S.bumpScale,S.side===hi&&(M.bumpScale.value*=-1)),S.normalMap&&(M.normalMap.value=S.normalMap,t(S.normalMap,M.normalMapTransform),M.normalScale.value.copy(S.normalScale),S.side===hi&&M.normalScale.value.negate()),S.displacementMap&&(M.displacementMap.value=S.displacementMap,t(S.displacementMap,M.displacementMapTransform),M.displacementScale.value=S.displacementScale,M.displacementBias.value=S.displacementBias),S.emissiveMap&&(M.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,M.emissiveMapTransform)),S.specularMap&&(M.specularMap.value=S.specularMap,t(S.specularMap,M.specularMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest);const A=e.get(S),L=A.envMap,C=A.envMapRotation;L&&(M.envMap.value=L,M.envMapRotation.value.setFromMatrix4(lP.makeRotationFromEuler(C)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&M.envMapRotation.value.premultiply(By),M.reflectivity.value=S.reflectivity,M.ior.value=S.ior,M.refractionRatio.value=S.refractionRatio),S.lightMap&&(M.lightMap.value=S.lightMap,M.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,M.lightMapTransform)),S.aoMap&&(M.aoMap.value=S.aoMap,M.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,M.aoMapTransform))}function c(M,S){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,S.map&&(M.map.value=S.map,t(S.map,M.mapTransform))}function d(M,S){M.dashSize.value=S.dashSize,M.totalSize.value=S.dashSize+S.gapSize,M.scale.value=S.scale}function h(M,S,A,L){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,M.size.value=S.size*A,M.scale.value=L*.5,S.map&&(M.map.value=S.map,t(S.map,M.uvTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest)}function f(M,S){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,M.rotation.value=S.rotation,S.map&&(M.map.value=S.map,t(S.map,M.mapTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest)}function x(M,S){M.specular.value.copy(S.specular),M.shininess.value=Math.max(S.shininess,1e-4)}function p(M,S){S.gradientMap&&(M.gradientMap.value=S.gradientMap)}function v(M,S){M.metalness.value=S.metalness,S.metalnessMap&&(M.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,M.metalnessMapTransform)),M.roughness.value=S.roughness,S.roughnessMap&&(M.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,M.roughnessMapTransform)),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)}function _(M,S,A){M.ior.value=S.ior,S.sheen>0&&(M.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),M.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(M.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,M.sheenColorMapTransform)),S.sheenRoughnessMap&&(M.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,M.sheenRoughnessMapTransform))),S.clearcoat>0&&(M.clearcoat.value=S.clearcoat,M.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(M.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,M.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(M.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,M.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(M.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,M.clearcoatNormalMapTransform),M.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===hi&&M.clearcoatNormalScale.value.negate())),S.dispersion>0&&(M.dispersion.value=S.dispersion),S.iridescence>0&&(M.iridescence.value=S.iridescence,M.iridescenceIOR.value=S.iridescenceIOR,M.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],M.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(M.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,M.iridescenceMapTransform)),S.iridescenceThicknessMap&&(M.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,M.iridescenceThicknessMapTransform))),S.transmission>0&&(M.transmission.value=S.transmission,M.transmissionSamplerMap.value=A.texture,M.transmissionSamplerSize.value.set(A.width,A.height),S.transmissionMap&&(M.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,M.transmissionMapTransform)),M.thickness.value=S.thickness,S.thicknessMap&&(M.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,M.thicknessMapTransform)),M.attenuationDistance.value=S.attenuationDistance,M.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(M.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(M.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,M.anisotropyMapTransform))),M.specularIntensity.value=S.specularIntensity,M.specularColor.value.copy(S.specularColor),S.specularColorMap&&(M.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,M.specularColorMapTransform)),S.specularIntensityMap&&(M.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,M.specularIntensityMapTransform))}function E(M,S){S.matcap&&(M.matcap.value=S.matcap)}function w(M,S){const A=e.get(S).light;M.referencePosition.value.setFromMatrixPosition(A.matrixWorld),M.nearDistance.value=A.shadow.camera.near,M.farDistance.value=A.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function uP(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,I){const N=I.program;r.uniformBlockBinding(C,N)}function f(C,I){let N=a[C.id];N===void 0&&(M(C),N=x(C),a[C.id]=N,C.addEventListener("dispose",A));const U=I.program;r.updateUBOMapping(C,U);const b=e.render.frame;l[C.id]!==b&&(v(C),l[C.id]=b)}function x(C){const I=p();C.__bindingPointIndex=I;const N=i.createBuffer(),U=C.__size,b=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,N),i.bufferData(i.UNIFORM_BUFFER,U,b),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,I,N),N}function p(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Dt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function v(C){const I=a[C.id],N=C.uniforms,U=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,I);for(let b=0,D=N.length;b<D;b++){const O=N[b];if(Array.isArray(O))for(let V=0,W=O.length;V<W;V++)_(O[V],b,V,U);else _(O,b,0,U)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function _(C,I,N,U){if(w(C,I,N,U)===!0){const b=C.__offset,D=C.value;if(Array.isArray(D)){let O=0;for(let V=0;V<D.length;V++){const W=D[V],j=S(W);E(W,C.__data,O),typeof W!="number"&&typeof W!="boolean"&&!W.isMatrix3&&!ArrayBuffer.isView(W)&&(O+=j.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(D,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,b,C.__data)}}function E(C,I,N){typeof C=="number"||typeof C=="boolean"?I[0]=C:C.isMatrix3?(I[0]=C.elements[0],I[1]=C.elements[1],I[2]=C.elements[2],I[3]=0,I[4]=C.elements[3],I[5]=C.elements[4],I[6]=C.elements[5],I[7]=0,I[8]=C.elements[6],I[9]=C.elements[7],I[10]=C.elements[8],I[11]=0):ArrayBuffer.isView(C)?I.set(new C.constructor(C.buffer,C.byteOffset,I.length)):C.toArray(I,N)}function w(C,I,N,U){const b=C.value,D=I+"_"+N;if(U[D]===void 0)return typeof b=="number"||typeof b=="boolean"?U[D]=b:ArrayBuffer.isView(b)?U[D]=b.slice():U[D]=b.clone(),!0;{const O=U[D];if(typeof b=="number"||typeof b=="boolean"){if(O!==b)return U[D]=b,!0}else{if(ArrayBuffer.isView(b))return!0;if(O.equals(b)===!1)return O.copy(b),!0}}return!1}function M(C){const I=C.uniforms;let N=0;const U=16;for(let D=0,O=I.length;D<O;D++){const V=Array.isArray(I[D])?I[D]:[I[D]];for(let W=0,j=V.length;W<j;W++){const ue=V[W],q=Array.isArray(ue.value)?ue.value:[ue.value];for(let pe=0,J=q.length;pe<J;pe++){const K=q[pe],re=S(K),he=N%U,z=he%re.boundary,ie=he+z;N+=z,ie!==0&&U-ie<re.storage&&(N+=U-ie),ue.__data=new Float32Array(re.storage/Float32Array.BYTES_PER_ELEMENT),ue.__offset=N,N+=re.storage}}}const b=N%U;return b>0&&(N+=U-b),C.__size=N,C.__cache={},this}function S(C){const I={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(I.boundary=4,I.storage=4):C.isVector2?(I.boundary=8,I.storage=8):C.isVector3||C.isColor?(I.boundary=16,I.storage=12):C.isVector4?(I.boundary=16,I.storage=16):C.isMatrix3?(I.boundary=48,I.storage=48):C.isMatrix4?(I.boundary=64,I.storage=64):C.isTexture?lt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(I.boundary=16,I.storage=C.byteLength):lt("WebGLRenderer: Unsupported uniform value type.",C),I}function A(C){const I=C.target;I.removeEventListener("dispose",A);const N=c.indexOf(I.__bindingPointIndex);c.splice(N,1),i.deleteBuffer(a[I.id]),delete a[I.id],delete l[I.id]}function L(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:h,update:f,dispose:L}}const dP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let ar=null;function hP(){return ar===null&&(ar=new Wb(dP,16,16,Ta,Kr),ar.name="DFG_LUT",ar.minFilter=jn,ar.magFilter=jn,ar.wrapS=jr,ar.wrapT=jr,ar.generateMipmaps=!1,ar.needsUpdate=!0),ar}class fP{constructor(e={}){const{canvas:t=Sb(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:x="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:v=!1,outputBufferType:_=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const w=_,M=new Set([km,Fm,Um]),S=new Set([Si,yr,Xl,$l,Dm,Im]),A=new Uint32Array(4),L=new Int32Array(4),C=new ne;let I=null,N=null;const U=[],b=[];let D=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=xr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const O=this;let V=!1,W=null,j=null,ue=null,q=null;this._outputColorSpace=Jn;let pe=0,J=0,K=null,re=-1,he=null;const z=new dn,ie=new dn;let Ie=null;const je=new vt(0);let He=0,H=t.width,ve=t.height,fe=1,te=null,Fe=null;const Xe=new dn(0,0,H,ve),kt=new dn(0,0,H,ve);let ct=!1;const Nt=new Hm;let bt=!1,yt=!1;const qt=new on,nn=new ne,jt=new dn,Kt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let It=!1;function Yt(){return K===null?fe:1}let Q=r;function mn(P,Z){return t.getContext(P,Z)}try{const P={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:x,failIfMajorPerformanceCaveat:p};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Am}`),t.addEventListener("webglcontextlost",Wt,!1),t.addEventListener("webglcontextrestored",Ot,!1),t.addEventListener("webglcontextcreationerror",Fn,!1),Q===null){const Z="webgl2";if(Q=mn(Z,P),Q===null)throw mn(Z)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(P){throw Dt("WebGLRenderer: "+P.message),P}let Rt,F,T,ee,ae,xe,Te,Ne,_e,ye,de,Ue,Ce,Ae,Je,it,st,$,Le,Se,ke,Oe,Me;function Ye(){Rt=new hA(Q),Rt.init(),ke=new iP(Q,Rt),F=new rA(Q,Rt,e,ke),T=new tP(Q,Rt),F.reversedDepthBuffer&&v&&T.buffers.depth.setReversed(!0),j=Q.createFramebuffer(),ue=Q.createFramebuffer(),q=Q.createFramebuffer(),ee=new mA(Q),ae=new H2,xe=new nP(Q,Rt,T,ae,F,ke,ee),Te=new dA(O),Ne=new _T(Q),Oe=new nA(Q,Ne),_e=new fA(Q,Ne,ee,Oe),ye=new xA(Q,_e,Ne,Oe,ee),$=new gA(Q,F,xe),Je=new sA(ae),de=new B2(O,Te,Rt,F,Oe,Je),Ue=new cP(O,ae),Ce=new G2,Ae=new K2(Rt),st=new tA(O,Te,T,ye,E,h),it=new eP(O,ye,F),Me=new uP(Q,ee,F,T),Le=new iA(Q,Rt,ee),Se=new pA(Q,Rt,ee),ee.programs=de.programs,O.capabilities=F,O.extensions=Rt,O.properties=ae,O.renderLists=Ce,O.shadowMap=it,O.state=T,O.info=ee}Ye(),w!==Si&&(D=new _A(w,t.width,t.height,d,a,l));const qe=new oP(O,Q);this.xr=qe,this.getContext=function(){return Q},this.getContextAttributes=function(){return Q.getContextAttributes()},this.forceContextLoss=function(){const P=Rt.get("WEBGL_lose_context");P&&P.loseContext()},this.forceContextRestore=function(){const P=Rt.get("WEBGL_lose_context");P&&P.restoreContext()},this.getPixelRatio=function(){return fe},this.setPixelRatio=function(P){P!==void 0&&(fe=P,this.setSize(H,ve,!1))},this.getSize=function(P){return P.set(H,ve)},this.setSize=function(P,Z,me=!0){if(qe.isPresenting){lt("WebGLRenderer: Can't change size while VR device is presenting.");return}H=P,ve=Z,t.width=Math.floor(P*fe),t.height=Math.floor(Z*fe),me===!0&&(t.style.width=P+"px",t.style.height=Z+"px"),D!==null&&D.setSize(t.width,t.height),this.setViewport(0,0,P,Z)},this.getDrawingBufferSize=function(P){return P.set(H*fe,ve*fe).floor()},this.setDrawingBufferSize=function(P,Z,me){H=P,ve=Z,fe=me,t.width=Math.floor(P*me),t.height=Math.floor(Z*me),this.setViewport(0,0,P,Z)},this.setEffects=function(P){if(w===Si){Dt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(P){for(let Z=0;Z<P.length;Z++)if(P[Z].isOutputPass===!0){lt("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}D.setEffects(P||[])},this.getCurrentViewport=function(P){return P.copy(z)},this.getViewport=function(P){return P.copy(Xe)},this.setViewport=function(P,Z,me,le){P.isVector4?Xe.set(P.x,P.y,P.z,P.w):Xe.set(P,Z,me,le),T.viewport(z.copy(Xe).multiplyScalar(fe).round())},this.getScissor=function(P){return P.copy(kt)},this.setScissor=function(P,Z,me,le){P.isVector4?kt.set(P.x,P.y,P.z,P.w):kt.set(P,Z,me,le),T.scissor(ie.copy(kt).multiplyScalar(fe).round())},this.getScissorTest=function(){return ct},this.setScissorTest=function(P){T.setScissorTest(ct=P)},this.setOpaqueSort=function(P){te=P},this.setTransparentSort=function(P){Fe=P},this.getClearColor=function(P){return P.copy(st.getClearColor())},this.setClearColor=function(){st.setClearColor(...arguments)},this.getClearAlpha=function(){return st.getClearAlpha()},this.setClearAlpha=function(){st.setClearAlpha(...arguments)},this.clear=function(P=!0,Z=!0,me=!0){let le=0;if(P){let oe=!1;if(K!==null){const De=K.texture.format;oe=M.has(De)}if(oe){const De=K.texture.type,We=S.has(De),Pe=st.getClearColor(),Qe=st.getClearAlpha(),nt=Pe.r,ht=Pe.g,ft=Pe.b;We?(A[0]=nt,A[1]=ht,A[2]=ft,A[3]=Qe,Q.clearBufferuiv(Q.COLOR,0,A)):(L[0]=nt,L[1]=ht,L[2]=ft,L[3]=Qe,Q.clearBufferiv(Q.COLOR,0,L))}else le|=Q.COLOR_BUFFER_BIT}Z&&(le|=Q.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),me&&(le|=Q.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),le!==0&&Q.clear(le)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(P){P.setRenderer(this),W=P},this.dispose=function(){t.removeEventListener("webglcontextlost",Wt,!1),t.removeEventListener("webglcontextrestored",Ot,!1),t.removeEventListener("webglcontextcreationerror",Fn,!1),st.dispose(),Ce.dispose(),Ae.dispose(),ae.dispose(),Te.dispose(),ye.dispose(),Oe.dispose(),Me.dispose(),de.dispose(),qe.dispose(),qe.removeEventListener("sessionstart",oc),qe.removeEventListener("sessionend",lc),Xn.stop()};function Wt(P){P.preventDefault(),ev("WebGLRenderer: Context Lost."),V=!0}function Ot(){ev("WebGLRenderer: Context Restored."),V=!1;const P=ee.autoReset,Z=it.enabled,me=it.autoUpdate,le=it.needsUpdate,oe=it.type;Ye(),ee.autoReset=P,it.enabled=Z,it.autoUpdate=me,it.needsUpdate=le,it.type=oe}function Fn(P){Dt("WebGLRenderer: A WebGL context could not be created. Reason: ",P.statusMessage)}function wi(P){const Z=P.target;Z.removeEventListener("dispose",wi),Hs(Z)}function Hs(P){Ra(P),ae.remove(P)}function Ra(P){const Z=ae.get(P).programs;Z!==void 0&&(Z.forEach(function(me){de.releaseProgram(me)}),P.isShaderMaterial&&de.releaseShaderCache(P))}this.renderBufferDirect=function(P,Z,me,le,oe,De){Z===null&&(Z=Kt);const We=oe.isMesh&&oe.matrixWorld.determinantAffine()<0,Pe=ln(P,Z,me,le,oe);T.setMaterial(le,We);let Qe=me.index,nt=1;if(le.wireframe===!0){if(Qe=_e.getWireframeAttribute(me),Qe===void 0)return;nt=2}const ht=me.drawRange,ft=me.attributes.position;let et=ht.start*nt,At=(ht.start+ht.count)*nt;De!==null&&(et=Math.max(et,De.start*nt),At=Math.min(At,(De.start+De.count)*nt)),Qe!==null?(et=Math.max(et,0),At=Math.min(At,Qe.count)):ft!=null&&(et=Math.max(et,0),At=Math.min(At,ft.count));const Qt=At-et;if(Qt<0||Qt===1/0)return;Oe.setup(oe,le,Pe,me,Qe);let rn,Ht=Le;if(Qe!==null&&(rn=Ne.get(Qe),Ht=Se,Ht.setIndex(rn)),oe.isMesh)le.wireframe===!0?(T.setLineWidth(le.wireframeLinewidth*Yt()),Ht.setMode(Q.LINES)):Ht.setMode(Q.TRIANGLES);else if(oe.isLine){let gn=le.linewidth;gn===void 0&&(gn=1),T.setLineWidth(gn*Yt()),oe.isLineSegments?Ht.setMode(Q.LINES):oe.isLineLoop?Ht.setMode(Q.LINE_LOOP):Ht.setMode(Q.LINE_STRIP)}else oe.isPoints?Ht.setMode(Q.POINTS):oe.isSprite&&Ht.setMode(Q.TRIANGLES);if(oe.isBatchedMesh)if(Rt.get("WEBGL_multi_draw"))Ht.renderMultiDraw(oe._multiDrawStarts,oe._multiDrawCounts,oe._multiDrawCount);else{const gn=oe._multiDrawStarts,Ve=oe._multiDrawCounts,Nn=oe._multiDrawCount,St=Qe?Ne.get(Qe).bytesPerElement:1,ei=ae.get(le).currentProgram.getUniforms();for(let ti=0;ti<Nn;ti++)ei.setValue(Q,"_gl_DrawID",ti),Ht.render(gn[ti]/St,Ve[ti])}else if(oe.isInstancedMesh)Ht.renderInstances(et,Qt,oe.count);else if(me.isInstancedBufferGeometry){const gn=me._maxInstanceCount!==void 0?me._maxInstanceCount:1/0,Ve=Math.min(me.instanceCount,gn);Ht.renderInstances(et,Qt,Ve)}else Ht.render(et,Qt)};function Vs(P,Z,me){P.transparent===!0&&P.side===hr&&P.forceSinglePass===!1?(P.side=hi,P.needsUpdate=!0,Ws(P,Z,me),P.side=Os,P.needsUpdate=!0,Ws(P,Z,me),P.side=hr):Ws(P,Z,me)}this.compile=function(P,Z,me=null){me===null&&(me=P),N=Ae.get(me),N.init(Z),b.push(N),me.traverseVisible(function(oe){oe.isLight&&oe.layers.test(Z.layers)&&(N.pushLight(oe),oe.castShadow&&N.pushShadow(oe))}),P!==me&&P.traverseVisible(function(oe){oe.isLight&&oe.layers.test(Z.layers)&&(N.pushLight(oe),oe.castShadow&&N.pushShadow(oe))}),N.setupLights();const le=new Set;return P.traverse(function(oe){if(!(oe.isMesh||oe.isPoints||oe.isLine||oe.isSprite))return;const De=oe.material;if(De)if(Array.isArray(De))for(let We=0;We<De.length;We++){const Pe=De[We];Vs(Pe,me,oe),le.add(Pe)}else Vs(De,me,oe),le.add(De)}),N=b.pop(),le},this.compileAsync=function(P,Z,me=null){const le=this.compile(P,Z,me);return new Promise(oe=>{function De(){if(le.forEach(function(We){ae.get(We).currentProgram.isReady()&&le.delete(We)}),le.size===0){oe(P);return}setTimeout(De,10)}Rt.get("KHR_parallel_shader_compile")!==null?De():setTimeout(De,10)})};let Gs=null;function Td(P){Gs&&Gs(P)}function oc(){Xn.stop()}function lc(){Xn.start()}const Xn=new Dy;Xn.setAnimationLoop(Td),typeof self<"u"&&Xn.setContext(self),this.setAnimationLoop=function(P){Gs=P,qe.setAnimationLoop(P),P===null?Xn.stop():Xn.start()},qe.addEventListener("sessionstart",oc),qe.addEventListener("sessionend",lc),this.render=function(P,Z){if(Z!==void 0&&Z.isCamera!==!0){Dt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(V===!0)return;W!==null&&W.renderStart(P,Z);const me=qe.enabled===!0&&qe.isPresenting===!0,le=D!==null&&(K===null||me)&&D.begin(O,K);if(P.matrixWorldAutoUpdate===!0&&P.updateMatrixWorld(),Z.parent===null&&Z.matrixWorldAutoUpdate===!0&&Z.updateMatrixWorld(),qe.enabled===!0&&qe.isPresenting===!0&&(D===null||D.isCompositing()===!1)&&(qe.cameraAutoUpdate===!0&&qe.updateCamera(Z),Z=qe.getCamera()),P.isScene===!0&&P.onBeforeRender(O,P,Z,K),N=Ae.get(P,b.length),N.init(Z),N.state.textureUnits=xe.getTextureUnits(),b.push(N),qt.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),Nt.setFromProjectionMatrix(qt,mr,Z.reversedDepth),yt=this.localClippingEnabled,bt=Je.init(this.clippingPlanes,yt),I=Ce.get(P,U.length),I.init(),U.push(I),qe.enabled===!0&&qe.isPresenting===!0){const We=O.xr.getDepthSensingMesh();We!==null&&Aa(We,Z,-1/0,O.sortObjects)}Aa(P,Z,0,O.sortObjects),I.finish(),O.sortObjects===!0&&I.sort(te,Fe,Z.reversedDepth),It=qe.enabled===!1||qe.isPresenting===!1||qe.hasDepthSensing()===!1,It&&st.addToRenderList(I,P),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),bt===!0&&Je.beginShadows();const oe=N.state.shadowsArray;if(it.render(oe,P,Z),bt===!0&&Je.endShadows(),(le&&D.hasRenderPass())===!1){const We=I.opaque,Pe=I.transmissive;if(N.setupLights(),Z.isArrayCamera){const Qe=Z.cameras;if(Pe.length>0)for(let nt=0,ht=Qe.length;nt<ht;nt++){const ft=Qe[nt];cc(We,Pe,P,ft)}It&&st.render(P);for(let nt=0,ht=Qe.length;nt<ht;nt++){const ft=Qe[nt];Wo(I,P,ft,ft.viewport)}}else Pe.length>0&&cc(We,Pe,P,Z),It&&st.render(P),Wo(I,P,Z)}K!==null&&J===0&&(xe.updateMultisampleRenderTarget(K),xe.updateRenderTargetMipmap(K)),le&&D.end(O),P.isScene===!0&&P.onAfterRender(O,P,Z),Oe.resetDefaultState(),re=-1,he=null,b.pop(),b.length>0?(N=b[b.length-1],xe.setTextureUnits(N.state.textureUnits),bt===!0&&Je.setGlobalState(O.clippingPlanes,N.state.camera)):N=null,U.pop(),U.length>0?I=U[U.length-1]:I=null,W!==null&&W.renderEnd()};function Aa(P,Z,me,le){if(P.visible===!1)return;if(P.layers.test(Z.layers)){if(P.isGroup)me=P.renderOrder;else if(P.isLOD)P.autoUpdate===!0&&P.update(Z);else if(P.isLightProbeGrid)N.pushLightProbeGrid(P);else if(P.isLight)N.pushLight(P),P.castShadow&&N.pushShadow(P);else if(P.isSprite){if(!P.frustumCulled||Nt.intersectsSprite(P)){le&&jt.setFromMatrixPosition(P.matrixWorld).applyMatrix4(qt);const We=ye.update(P),Pe=P.material;Pe.visible&&I.push(P,We,Pe,me,jt.z,null)}}else if((P.isMesh||P.isLine||P.isPoints)&&(!P.frustumCulled||Nt.intersectsObject(P))){const We=ye.update(P),Pe=P.material;if(le&&(P.boundingSphere!==void 0?(P.boundingSphere===null&&P.computeBoundingSphere(),jt.copy(P.boundingSphere.center)):(We.boundingSphere===null&&We.computeBoundingSphere(),jt.copy(We.boundingSphere.center)),jt.applyMatrix4(P.matrixWorld).applyMatrix4(qt)),Array.isArray(Pe)){const Qe=We.groups;for(let nt=0,ht=Qe.length;nt<ht;nt++){const ft=Qe[nt],et=Pe[ft.materialIndex];et&&et.visible&&I.push(P,We,et,me,jt.z,ft)}}else Pe.visible&&I.push(P,We,Pe,me,jt.z,null)}}const De=P.children;for(let We=0,Pe=De.length;We<Pe;We++)Aa(De[We],Z,me,le)}function Wo(P,Z,me,le){const{opaque:oe,transmissive:De,transparent:We}=P;N.setupLightsView(me),bt===!0&&Je.setGlobalState(O.clippingPlanes,me),le&&T.viewport(z.copy(le)),oe.length>0&&js(oe,Z,me),De.length>0&&js(De,Z,me),We.length>0&&js(We,Z,me),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function cc(P,Z,me,le){if((me.isScene===!0?me.overrideMaterial:null)!==null)return;if(N.state.transmissionRenderTarget[le.id]===void 0){const et=Rt.has("EXT_color_buffer_half_float")||Rt.has("EXT_color_buffer_float");N.state.transmissionRenderTarget[le.id]=new vr(1,1,{generateMipmaps:!0,type:et?Kr:Si,minFilter:ha,samples:Math.max(4,F.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ct.workingColorSpace})}const De=N.state.transmissionRenderTarget[le.id],We=le.viewport||z;De.setSize(We.z*O.transmissionResolutionScale,We.w*O.transmissionResolutionScale);const Pe=O.getRenderTarget(),Qe=O.getActiveCubeFace(),nt=O.getActiveMipmapLevel();O.setRenderTarget(De),O.getClearColor(je),He=O.getClearAlpha(),He<1&&O.setClearColor(16777215,.5),O.clear(),It&&st.render(me);const ht=O.toneMapping;O.toneMapping=xr;const ft=le.viewport;if(le.viewport!==void 0&&(le.viewport=void 0),N.setupLightsView(le),bt===!0&&Je.setGlobalState(O.clippingPlanes,le),js(P,me,le),xe.updateMultisampleRenderTarget(De),xe.updateRenderTargetMipmap(De),Rt.has("WEBGL_multisampled_render_to_texture")===!1){let et=!1;for(let At=0,Qt=Z.length;At<Qt;At++){const rn=Z[At],{object:Ht,geometry:gn,material:Ve,group:Nn}=rn;if(Ve.side===hr&&Ht.layers.test(le.layers)){const St=Ve.side;Ve.side=hi,Ve.needsUpdate=!0,Xo(Ht,me,le,gn,Ve,Nn),Ve.side=St,Ve.needsUpdate=!0,et=!0}}et===!0&&(xe.updateMultisampleRenderTarget(De),xe.updateRenderTargetMipmap(De))}O.setRenderTarget(Pe,Qe,nt),O.setClearColor(je,He),ft!==void 0&&(le.viewport=ft),O.toneMapping=ht}function js(P,Z,me){const le=Z.isScene===!0?Z.overrideMaterial:null;for(let oe=0,De=P.length;oe<De;oe++){const We=P[oe],{object:Pe,geometry:Qe,group:nt}=We;let ht=We.material;ht.allowOverride===!0&&le!==null&&(ht=le),Pe.layers.test(me.layers)&&Xo(Pe,Z,me,Qe,ht,nt)}}function Xo(P,Z,me,le,oe,De){P.onBeforeRender(O,Z,me,le,oe,De),P.modelViewMatrix.multiplyMatrices(me.matrixWorldInverse,P.matrixWorld),P.normalMatrix.getNormalMatrix(P.modelViewMatrix),oe.onBeforeRender(O,Z,me,le,P,De),oe.transparent===!0&&oe.side===hr&&oe.forceSinglePass===!1?(oe.side=hi,oe.needsUpdate=!0,O.renderBufferDirect(me,Z,le,oe,P,De),oe.side=Os,oe.needsUpdate=!0,O.renderBufferDirect(me,Z,le,oe,P,De),oe.side=hr):O.renderBufferDirect(me,Z,le,oe,P,De),P.onAfterRender(O,Z,me,le,oe,De)}function Ws(P,Z,me){Z.isScene!==!0&&(Z=Kt);const le=ae.get(P),oe=N.state.lights,De=N.state.shadowsArray,We=oe.state.version,Pe=de.getParameters(P,oe.state,De,Z,me,N.state.lightProbeGridArray),Qe=de.getProgramCacheKey(Pe);let nt=le.programs;le.environment=P.isMeshStandardMaterial||P.isMeshLambertMaterial||P.isMeshPhongMaterial?Z.environment:null,le.fog=Z.fog;const ht=P.isMeshStandardMaterial||P.isMeshLambertMaterial&&!P.envMap||P.isMeshPhongMaterial&&!P.envMap;le.envMap=Te.get(P.envMap||le.environment,ht),le.envMapRotation=le.environment!==null&&P.envMap===null?Z.environmentRotation:P.envMapRotation,nt===void 0&&(P.addEventListener("dispose",wi),nt=new Map,le.programs=nt);let ft=nt.get(Qe);if(ft!==void 0){if(le.currentProgram===ft&&le.lightsStateVersion===We)return uc(P,Pe),ft}else Pe.uniforms=de.getUniforms(P),W!==null&&P.isNodeMaterial&&W.build(P,me,Pe),P.onBeforeCompile(Pe,O),ft=de.acquireProgram(Pe,Qe),nt.set(Qe,ft),le.uniforms=Pe.uniforms;const et=le.uniforms;return(!P.isShaderMaterial&&!P.isRawShaderMaterial||P.clipping===!0)&&(et.clippingPlanes=Je.uniform),uc(P,Pe),le.needsLights=qo(P),le.lightsStateVersion=We,le.needsLights&&(et.ambientLightColor.value=oe.state.ambient,et.lightProbe.value=oe.state.probe,et.directionalLights.value=oe.state.directional,et.directionalLightShadows.value=oe.state.directionalShadow,et.spotLights.value=oe.state.spot,et.spotLightShadows.value=oe.state.spotShadow,et.rectAreaLights.value=oe.state.rectArea,et.ltc_1.value=oe.state.rectAreaLTC1,et.ltc_2.value=oe.state.rectAreaLTC2,et.pointLights.value=oe.state.point,et.pointLightShadows.value=oe.state.pointShadow,et.hemisphereLights.value=oe.state.hemi,et.directionalShadowMatrix.value=oe.state.directionalShadowMatrix,et.spotLightMatrix.value=oe.state.spotLightMatrix,et.spotLightMap.value=oe.state.spotLightMap,et.pointShadowMatrix.value=oe.state.pointShadowMatrix),le.lightProbeGrid=N.state.lightProbeGridArray.length>0,le.currentProgram=ft,le.uniformsList=null,ft}function $o(P){if(P.uniformsList===null){const Z=P.currentProgram.getUniforms();P.uniformsList=Ju.seqWithValue(Z.seq,P.uniforms)}return P.uniformsList}function uc(P,Z){const me=ae.get(P);me.outputColorSpace=Z.outputColorSpace,me.batching=Z.batching,me.batchingColor=Z.batchingColor,me.instancing=Z.instancing,me.instancingColor=Z.instancingColor,me.instancingMorph=Z.instancingMorph,me.skinning=Z.skinning,me.morphTargets=Z.morphTargets,me.morphNormals=Z.morphNormals,me.morphColors=Z.morphColors,me.morphTargetsCount=Z.morphTargetsCount,me.numClippingPlanes=Z.numClippingPlanes,me.numIntersection=Z.numClipIntersection,me.vertexAlphas=Z.vertexAlphas,me.vertexTangents=Z.vertexTangents,me.toneMapping=Z.toneMapping}function Cd(P,Z){if(P.length===0)return null;if(P.length===1)return P[0].texture!==null?P[0]:null;C.setFromMatrixPosition(Z.matrixWorld);for(let me=0,le=P.length;me<le;me++){const oe=P[me];if(oe.texture!==null&&oe.boundingBox.containsPoint(C))return oe}return null}function ln(P,Z,me,le,oe){Z.isScene!==!0&&(Z=Kt),xe.resetTextureUnits();const De=Z.fog,We=le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial?Z.environment:null,Pe=K===null?O.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:Ct.workingColorSpace,Qe=le.isMeshStandardMaterial||le.isMeshLambertMaterial&&!le.envMap||le.isMeshPhongMaterial&&!le.envMap,nt=Te.get(le.envMap||We,Qe),ht=le.vertexColors===!0&&!!me.attributes.color&&me.attributes.color.itemSize===4,ft=!!me.attributes.tangent&&(!!le.normalMap||le.anisotropy>0),et=!!me.morphAttributes.position,At=!!me.morphAttributes.normal,Qt=!!me.morphAttributes.color;let rn=xr;le.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(rn=O.toneMapping);const Ht=me.morphAttributes.position||me.morphAttributes.normal||me.morphAttributes.color,gn=Ht!==void 0?Ht.length:0,Ve=ae.get(le),Nn=N.state.lights;if(bt===!0&&(yt===!0||P!==he)){const Vt=P===he&&le.id===re;Je.setState(le,P,Vt)}let St=!1;le.version===Ve.__version?(Ve.needsLights&&Ve.lightsStateVersion!==Nn.state.version||Ve.outputColorSpace!==Pe||oe.isBatchedMesh&&Ve.batching===!1||!oe.isBatchedMesh&&Ve.batching===!0||oe.isBatchedMesh&&Ve.batchingColor===!0&&oe.colorTexture===null||oe.isBatchedMesh&&Ve.batchingColor===!1&&oe.colorTexture!==null||oe.isInstancedMesh&&Ve.instancing===!1||!oe.isInstancedMesh&&Ve.instancing===!0||oe.isSkinnedMesh&&Ve.skinning===!1||!oe.isSkinnedMesh&&Ve.skinning===!0||oe.isInstancedMesh&&Ve.instancingColor===!0&&oe.instanceColor===null||oe.isInstancedMesh&&Ve.instancingColor===!1&&oe.instanceColor!==null||oe.isInstancedMesh&&Ve.instancingMorph===!0&&oe.morphTexture===null||oe.isInstancedMesh&&Ve.instancingMorph===!1&&oe.morphTexture!==null||Ve.envMap!==nt||le.fog===!0&&Ve.fog!==De||Ve.numClippingPlanes!==void 0&&(Ve.numClippingPlanes!==Je.numPlanes||Ve.numIntersection!==Je.numIntersection)||Ve.vertexAlphas!==ht||Ve.vertexTangents!==ft||Ve.morphTargets!==et||Ve.morphNormals!==At||Ve.morphColors!==Qt||Ve.toneMapping!==rn||Ve.morphTargetsCount!==gn||!!Ve.lightProbeGrid!=N.state.lightProbeGridArray.length>0)&&(St=!0):(St=!0,Ve.__version=le.version);let ei=Ve.currentProgram;St===!0&&(ei=Ws(le,Z,oe),W&&le.isNodeMaterial&&W.onUpdateProgram(le,ei,Ve));let ti=!1,Mt=!1,Er=!1;const zt=ei.getUniforms(),Jt=Ve.uniforms;if(T.useProgram(ei.program)&&(ti=!0,Mt=!0,Er=!0),le.id!==re&&(re=le.id,Mt=!0),Ve.needsLights){const Vt=Cd(N.state.lightProbeGridArray,oe);Ve.lightProbeGrid!==Vt&&(Ve.lightProbeGrid=Vt,Mt=!0)}if(ti||he!==P){T.buffers.depth.getReversed()&&P.reversedDepth!==!0&&(P._reversedDepth=!0,P.updateProjectionMatrix()),zt.setValue(Q,"projectionMatrix",P.projectionMatrix),zt.setValue(Q,"viewMatrix",P.matrixWorldInverse);const ki=zt.map.cameraPosition;ki!==void 0&&ki.setValue(Q,nn.setFromMatrixPosition(P.matrixWorld)),F.logarithmicDepthBuffer&&zt.setValue(Q,"logDepthBufFC",2/(Math.log(P.far+1)/Math.LN2)),(le.isMeshPhongMaterial||le.isMeshToonMaterial||le.isMeshLambertMaterial||le.isMeshBasicMaterial||le.isMeshStandardMaterial||le.isShaderMaterial)&&zt.setValue(Q,"isOrthographic",P.isOrthographicCamera===!0),he!==P&&(he=P,Mt=!0,Er=!0)}if(Ve.needsLights&&(Nn.state.directionalShadowMap.length>0&&zt.setValue(Q,"directionalShadowMap",Nn.state.directionalShadowMap,xe),Nn.state.spotShadowMap.length>0&&zt.setValue(Q,"spotShadowMap",Nn.state.spotShadowMap,xe),Nn.state.pointShadowMap.length>0&&zt.setValue(Q,"pointShadowMap",Nn.state.pointShadowMap,xe)),oe.isSkinnedMesh){zt.setOptional(Q,oe,"bindMatrix"),zt.setOptional(Q,oe,"bindMatrixInverse");const Vt=oe.skeleton;Vt&&(Vt.boneTexture===null&&Vt.computeBoneTexture(),zt.setValue(Q,"boneTexture",Vt.boneTexture,xe))}oe.isBatchedMesh&&(zt.setOptional(Q,oe,"batchingTexture"),zt.setValue(Q,"batchingTexture",oe._matricesTexture,xe),zt.setOptional(Q,oe,"batchingIdTexture"),zt.setValue(Q,"batchingIdTexture",oe._indirectTexture,xe),zt.setOptional(Q,oe,"batchingColorTexture"),oe._colorsTexture!==null&&zt.setValue(Q,"batchingColorTexture",oe._colorsTexture,xe));const Fi=me.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&$.update(oe,me,ei),(Mt||Ve.receiveShadow!==oe.receiveShadow)&&(Ve.receiveShadow=oe.receiveShadow,zt.setValue(Q,"receiveShadow",oe.receiveShadow)),(le.isMeshStandardMaterial||le.isMeshLambertMaterial||le.isMeshPhongMaterial)&&le.envMap===null&&Z.environment!==null&&(Jt.envMapIntensity.value=Z.environmentIntensity),Jt.dfgLUT!==void 0&&(Jt.dfgLUT.value=hP()),Mt){if(zt.setValue(Q,"toneMappingExposure",O.toneMappingExposure),Ve.needsLights&&Rd(Jt,Er),De&&le.fog===!0&&Ue.refreshFogUniforms(Jt,De),Ue.refreshMaterialUniforms(Jt,le,fe,ve,N.state.transmissionRenderTarget[P.id]),Ve.needsLights&&Ve.lightProbeGrid){const Vt=Ve.lightProbeGrid;Jt.probesSH.value=Vt.texture,Jt.probesMin.value.copy(Vt.boundingBox.min),Jt.probesMax.value.copy(Vt.boundingBox.max),Jt.probesResolution.value.copy(Vt.resolution)}Ju.upload(Q,$o(Ve),Jt,xe)}if(le.isShaderMaterial&&le.uniformsNeedUpdate===!0&&(Ju.upload(Q,$o(Ve),Jt,xe),le.uniformsNeedUpdate=!1),le.isSpriteMaterial&&zt.setValue(Q,"center",oe.center),zt.setValue(Q,"modelViewMatrix",oe.modelViewMatrix),zt.setValue(Q,"normalMatrix",oe.normalMatrix),zt.setValue(Q,"modelMatrix",oe.matrixWorld),le.uniformsGroups!==void 0){const Vt=le.uniformsGroups;for(let ki=0,er=Vt.length;ki<er;ki++){const Xs=Vt[ki];Me.update(Xs,ei),Me.bind(Xs,ei)}}return ei}function Rd(P,Z){P.ambientLightColor.needsUpdate=Z,P.lightProbe.needsUpdate=Z,P.directionalLights.needsUpdate=Z,P.directionalLightShadows.needsUpdate=Z,P.pointLights.needsUpdate=Z,P.pointLightShadows.needsUpdate=Z,P.spotLights.needsUpdate=Z,P.spotLightShadows.needsUpdate=Z,P.rectAreaLights.needsUpdate=Z,P.hemisphereLights.needsUpdate=Z}function qo(P){return P.isMeshLambertMaterial||P.isMeshToonMaterial||P.isMeshPhongMaterial||P.isMeshStandardMaterial||P.isShadowMaterial||P.isShaderMaterial&&P.lights===!0}this.getActiveCubeFace=function(){return pe},this.getActiveMipmapLevel=function(){return J},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(P,Z,me){const le=ae.get(P);le.__autoAllocateDepthBuffer=P.resolveDepthBuffer===!1,le.__autoAllocateDepthBuffer===!1&&(le.__useRenderToTexture=!1),ae.get(P.texture).__webglTexture=Z,ae.get(P.depthTexture).__webglTexture=le.__autoAllocateDepthBuffer?void 0:me,le.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(P,Z){const me=ae.get(P);me.__webglFramebuffer=Z,me.__useDefaultFramebuffer=Z===void 0},this.setRenderTarget=function(P,Z=0,me=0){K=P,pe=Z,J=me;let le=null,oe=!1,De=!1;if(P){const Pe=ae.get(P);if(Pe.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(Q.FRAMEBUFFER,Pe.__webglFramebuffer),z.copy(P.viewport),ie.copy(P.scissor),Ie=P.scissorTest,T.viewport(z),T.scissor(ie),T.setScissorTest(Ie),re=-1;return}else if(Pe.__webglFramebuffer===void 0)xe.setupRenderTarget(P);else if(Pe.__hasExternalTextures)xe.rebindTextures(P,ae.get(P.texture).__webglTexture,ae.get(P.depthTexture).__webglTexture);else if(P.depthBuffer){const ht=P.depthTexture;if(Pe.__boundDepthTexture!==ht){if(ht!==null&&ae.has(ht)&&(P.width!==ht.image.width||P.height!==ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");xe.setupDepthRenderbuffer(P)}}const Qe=P.texture;(Qe.isData3DTexture||Qe.isDataArrayTexture||Qe.isCompressedArrayTexture)&&(De=!0);const nt=ae.get(P).__webglFramebuffer;P.isWebGLCubeRenderTarget?(Array.isArray(nt[Z])?le=nt[Z][me]:le=nt[Z],oe=!0):P.samples>0&&xe.useMultisampledRTT(P)===!1?le=ae.get(P).__webglMultisampledFramebuffer:Array.isArray(nt)?le=nt[me]:le=nt,z.copy(P.viewport),ie.copy(P.scissor),Ie=P.scissorTest}else z.copy(Xe).multiplyScalar(fe).floor(),ie.copy(kt).multiplyScalar(fe).floor(),Ie=ct;if(me!==0&&(le=j),T.bindFramebuffer(Q.FRAMEBUFFER,le)&&T.drawBuffers(P,le),T.viewport(z),T.scissor(ie),T.setScissorTest(Ie),oe){const Pe=ae.get(P.texture);Q.framebufferTexture2D(Q.FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Pe.__webglTexture,me)}else if(De){const Pe=Z;for(let Qe=0;Qe<P.textures.length;Qe++){const nt=ae.get(P.textures[Qe]);Q.framebufferTextureLayer(Q.FRAMEBUFFER,Q.COLOR_ATTACHMENT0+Qe,nt.__webglTexture,me,Pe)}}else if(P!==null&&me!==0){const Pe=ae.get(P.texture);Q.framebufferTexture2D(Q.FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_2D,Pe.__webglTexture,me)}re=-1},this.readRenderTargetPixels=function(P,Z,me,le,oe,De,We,Pe=0){if(!(P&&P.isWebGLRenderTarget)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Qe=ae.get(P).__webglFramebuffer;if(P.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe){T.bindFramebuffer(Q.FRAMEBUFFER,Qe);try{const nt=P.textures[Pe],ht=nt.format,ft=nt.type;if(P.textures.length>1&&Q.readBuffer(Q.COLOR_ATTACHMENT0+Pe),!F.textureFormatReadable(ht)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!F.textureTypeReadable(ft)){Dt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Z>=0&&Z<=P.width-le&&me>=0&&me<=P.height-oe&&Q.readPixels(Z,me,le,oe,ke.convert(ht),ke.convert(ft),De)}finally{const nt=K!==null?ae.get(K).__webglFramebuffer:null;T.bindFramebuffer(Q.FRAMEBUFFER,nt)}}},this.readRenderTargetPixelsAsync=async function(P,Z,me,le,oe,De,We,Pe=0){if(!(P&&P.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Qe=ae.get(P).__webglFramebuffer;if(P.isWebGLCubeRenderTarget&&We!==void 0&&(Qe=Qe[We]),Qe)if(Z>=0&&Z<=P.width-le&&me>=0&&me<=P.height-oe){T.bindFramebuffer(Q.FRAMEBUFFER,Qe);const nt=P.textures[Pe],ht=nt.format,ft=nt.type;if(P.textures.length>1&&Q.readBuffer(Q.COLOR_ATTACHMENT0+Pe),!F.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!F.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const et=Q.createBuffer();Q.bindBuffer(Q.PIXEL_PACK_BUFFER,et),Q.bufferData(Q.PIXEL_PACK_BUFFER,De.byteLength,Q.STREAM_READ),Q.readPixels(Z,me,le,oe,ke.convert(ht),ke.convert(ft),0);const At=K!==null?ae.get(K).__webglFramebuffer:null;T.bindFramebuffer(Q.FRAMEBUFFER,At);const Qt=Q.fenceSync(Q.SYNC_GPU_COMMANDS_COMPLETE,0);return Q.flush(),await Mb(Q,Qt,4),Q.bindBuffer(Q.PIXEL_PACK_BUFFER,et),Q.getBufferSubData(Q.PIXEL_PACK_BUFFER,0,De),Q.deleteBuffer(et),Q.deleteSync(Qt),De}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(P,Z=null,me=0){const le=Math.pow(2,-me),oe=Math.floor(P.image.width*le),De=Math.floor(P.image.height*le),We=Z!==null?Z.x:0,Pe=Z!==null?Z.y:0;xe.setTexture2D(P,0),Q.copyTexSubImage2D(Q.TEXTURE_2D,me,0,0,We,Pe,oe,De),T.unbindTexture()},this.copyTextureToTexture=function(P,Z,me=null,le=null,oe=0,De=0){let We,Pe,Qe,nt,ht,ft,et,At,Qt;const rn=P.isCompressedTexture?P.mipmaps[De]:P.image;if(me!==null)We=me.max.x-me.min.x,Pe=me.max.y-me.min.y,Qe=me.isBox3?me.max.z-me.min.z:1,nt=me.min.x,ht=me.min.y,ft=me.isBox3?me.min.z:0;else{const Jt=Math.pow(2,-oe);We=Math.floor(rn.width*Jt),Pe=Math.floor(rn.height*Jt),P.isDataArrayTexture?Qe=rn.depth:P.isData3DTexture?Qe=Math.floor(rn.depth*Jt):Qe=1,nt=0,ht=0,ft=0}le!==null?(et=le.x,At=le.y,Qt=le.z):(et=0,At=0,Qt=0);const Ht=ke.convert(Z.format),gn=ke.convert(Z.type);let Ve;Z.isData3DTexture?(xe.setTexture3D(Z,0),Ve=Q.TEXTURE_3D):Z.isDataArrayTexture||Z.isCompressedArrayTexture?(xe.setTexture2DArray(Z,0),Ve=Q.TEXTURE_2D_ARRAY):(xe.setTexture2D(Z,0),Ve=Q.TEXTURE_2D),T.activeTexture(Q.TEXTURE0),T.pixelStorei(Q.UNPACK_FLIP_Y_WEBGL,Z.flipY),T.pixelStorei(Q.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Z.premultiplyAlpha),T.pixelStorei(Q.UNPACK_ALIGNMENT,Z.unpackAlignment);const Nn=T.getParameter(Q.UNPACK_ROW_LENGTH),St=T.getParameter(Q.UNPACK_IMAGE_HEIGHT),ei=T.getParameter(Q.UNPACK_SKIP_PIXELS),ti=T.getParameter(Q.UNPACK_SKIP_ROWS),Mt=T.getParameter(Q.UNPACK_SKIP_IMAGES);T.pixelStorei(Q.UNPACK_ROW_LENGTH,rn.width),T.pixelStorei(Q.UNPACK_IMAGE_HEIGHT,rn.height),T.pixelStorei(Q.UNPACK_SKIP_PIXELS,nt),T.pixelStorei(Q.UNPACK_SKIP_ROWS,ht),T.pixelStorei(Q.UNPACK_SKIP_IMAGES,ft);const Er=P.isDataArrayTexture||P.isData3DTexture,zt=Z.isDataArrayTexture||Z.isData3DTexture;if(P.isDepthTexture){const Jt=ae.get(P),Fi=ae.get(Z),Vt=ae.get(Jt.__renderTarget),ki=ae.get(Fi.__renderTarget);T.bindFramebuffer(Q.READ_FRAMEBUFFER,Vt.__webglFramebuffer),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,ki.__webglFramebuffer);for(let er=0;er<Qe;er++)Er&&(Q.framebufferTextureLayer(Q.READ_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,ae.get(P).__webglTexture,oe,ft+er),Q.framebufferTextureLayer(Q.DRAW_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,ae.get(Z).__webglTexture,De,Qt+er)),Q.blitFramebuffer(nt,ht,We,Pe,et,At,We,Pe,Q.DEPTH_BUFFER_BIT,Q.NEAREST);T.bindFramebuffer(Q.READ_FRAMEBUFFER,null),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,null)}else if(oe!==0||P.isRenderTargetTexture||ae.has(P)){const Jt=ae.get(P),Fi=ae.get(Z);T.bindFramebuffer(Q.READ_FRAMEBUFFER,ue),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,q);for(let Vt=0;Vt<Qe;Vt++)Er?Q.framebufferTextureLayer(Q.READ_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Jt.__webglTexture,oe,ft+Vt):Q.framebufferTexture2D(Q.READ_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_2D,Jt.__webglTexture,oe),zt?Q.framebufferTextureLayer(Q.DRAW_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Fi.__webglTexture,De,Qt+Vt):Q.framebufferTexture2D(Q.DRAW_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_2D,Fi.__webglTexture,De),oe!==0?Q.blitFramebuffer(nt,ht,We,Pe,et,At,We,Pe,Q.COLOR_BUFFER_BIT,Q.NEAREST):zt?Q.copyTexSubImage3D(Ve,De,et,At,Qt+Vt,nt,ht,We,Pe):Q.copyTexSubImage2D(Ve,De,et,At,nt,ht,We,Pe);T.bindFramebuffer(Q.READ_FRAMEBUFFER,null),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,null)}else zt?P.isDataTexture||P.isData3DTexture?Q.texSubImage3D(Ve,De,et,At,Qt,We,Pe,Qe,Ht,gn,rn.data):Z.isCompressedArrayTexture?Q.compressedTexSubImage3D(Ve,De,et,At,Qt,We,Pe,Qe,Ht,rn.data):Q.texSubImage3D(Ve,De,et,At,Qt,We,Pe,Qe,Ht,gn,rn):P.isDataTexture?Q.texSubImage2D(Q.TEXTURE_2D,De,et,At,We,Pe,Ht,gn,rn.data):P.isCompressedTexture?Q.compressedTexSubImage2D(Q.TEXTURE_2D,De,et,At,rn.width,rn.height,Ht,rn.data):Q.texSubImage2D(Q.TEXTURE_2D,De,et,At,We,Pe,Ht,gn,rn);T.pixelStorei(Q.UNPACK_ROW_LENGTH,Nn),T.pixelStorei(Q.UNPACK_IMAGE_HEIGHT,St),T.pixelStorei(Q.UNPACK_SKIP_PIXELS,ei),T.pixelStorei(Q.UNPACK_SKIP_ROWS,ti),T.pixelStorei(Q.UNPACK_SKIP_IMAGES,Mt),De===0&&Z.generateMipmaps&&Q.generateMipmap(Ve),T.unbindTexture()},this.initRenderTarget=function(P){ae.get(P).__webglFramebuffer===void 0&&xe.setupRenderTarget(P)},this.initTexture=function(P){P.isCubeTexture?xe.setTextureCube(P,0):P.isData3DTexture?xe.setTexture3D(P,0):P.isDataArrayTexture||P.isCompressedArrayTexture?xe.setTexture2DArray(P,0):xe.setTexture2D(P,0),T.unbindTexture()},this.resetState=function(){pe=0,J=0,K=null,T.reset(),Oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Ct._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ct._getUnpackColorSpace()}}const pP=/^[og]\s*(.+)?/,mP=/^mtllib /,gP=/^usemtl /,xP=/^usemap /,e_=/\s+/,t_=new ne,Jf=new ne,n_=new ne,i_=new ne,Li=new ne,Hu=new vt;function vP(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;t_.fromArray(a,e),Jf.fromArray(a,t),n_.fromArray(a,r),Li.subVectors(n_,Jf),i_.subVectors(t_,Jf),Li.cross(i_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const x=this.vertices.length;let p=this.parseVertexIndex(e,x),v=this.parseVertexIndex(t,x),_=this.parseVertexIndex(r,x);if(this.addVertex(p,v,_),this.addColor(p,v,_),d!==void 0&&d!==""){const E=this.normals.length;p=this.parseNormalIndex(d,E),v=this.parseNormalIndex(h,E),_=this.parseNormalIndex(f,E),this.addNormal(p,v,_)}else this.addFaceNormal(p,v,_);if(a!==void 0&&a!==""){const E=this.uvs.length;p=this.parseUVIndex(a,E),v=this.parseUVIndex(l,E),_=this.parseUVIndex(c,E),this.addUV(p,v,_),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class _P extends ac{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new lT(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new vP;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const x=f.charAt(0);if(x!=="#")if(x==="v"){const p=f.split(e_);switch(p[0]){case"v":t.vertices.push(parseFloat(p[1]),parseFloat(p[2]),parseFloat(p[3])),p.length>=7?(Hu.setRGB(parseFloat(p[4]),parseFloat(p[5]),parseFloat(p[6]),Jn),t.colors.push(Hu.r,Hu.g,Hu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(p[1]),parseFloat(p[2]),parseFloat(p[3]));break;case"vt":t.uvs.push(parseFloat(p[1]),parseFloat(p[2]));break}}else if(x==="f"){const v=f.slice(1).trim().split(e_),_=[];for(let w=0,M=v.length;w<M;w++){const S=v[w];if(S.length>0){const A=S.split("/");_.push(A)}}const E=_[0];for(let w=1,M=_.length-1;w<M;w++){const S=_[w],A=_[w+1];t.addFace(E[0],S[0],A[0],E[1],S[1],A[1],E[2],S[2],A[2])}}else if(x==="l"){const p=f.substring(1).trim().split(" ");let v=[];const _=[];if(f.indexOf("/")===-1)v=p;else for(let E=0,w=p.length;E<w;E++){const M=p[E].split("/");M[0]!==""&&v.push(M[0]),M[1]!==""&&_.push(M[1])}t.addLineGeometry(v,_)}else if(x==="p"){const v=f.slice(1).trim().split(" ");t.addPointGeometry(v)}else if((a=pP.exec(f))!==null){const p=(" "+a[0].slice(1).trim()).slice(1);t.startObject(p)}else if(gP.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(mP.test(f))t.materialLibraries.push(f.substring(7).trim());else if(xP.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(x==="s"){if(a=f.split(" "),a.length>1){const v=a[1].trim().toLowerCase();t.object.smooth=v!=="0"&&v!=="off"}else t.object.smooth=!0;const p=t.object.currentMaterial();p&&(p.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Ol;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],x=f.geometry,p=f.materials,v=x.type==="Line",_=x.type==="Points";let E=!1;if(x.vertices.length===0)continue;const w=new Mi;w.setAttribute("position",new In(x.vertices,3)),x.normals.length>0&&w.setAttribute("normal",new In(x.normals,3)),x.colors.length>0&&(E=!0,w.setAttribute("color",new In(x.colors,3))),x.hasUVIndices===!0&&w.setAttribute("uv",new In(x.uvs,2));const M=[];for(let A=0,L=p.length;A<L;A++){const C=p[A],I=C.name+"_"+C.smooth+"_"+E;let N=t.materials[I];if(this.materials!==null){if(N=this.materials.create(C.name),v&&N&&!(N instanceof Zu)){const U=new Zu;Sr.prototype.copy.call(U,N),U.color.copy(N.color),N=U}else if(_&&N&&!(N instanceof zl)){const U=new zl({size:10,sizeAttenuation:!1});Sr.prototype.copy.call(U,N),U.color.copy(N.color),U.map=N.map,N=U}}N===void 0&&(v?N=new Zu:_?N=new zl({size:1,sizeAttenuation:!1}):N=new nT,N.name=C.name,N.flatShading=!C.smooth,N.vertexColors=E,t.materials[I]=N),M.push(N)}let S;if(M.length>1){for(let A=0,L=p.length;A<L;A++){const C=p[A];w.addGroup(C.groupStart,C.groupCount,A)}v?S=new _v(w,M):_?S=new Gf(w,M):S=new Qi(w,M)}else v?S=new _v(w,M[0]):_?S=new Gf(w,M[0]):S=new Qi(w,M[0]);S.name=f.name,l.add(S)}else if(t.vertices.length>0){const d=new zl({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new In(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new In(t.colors,3)),d.vertexColors=!0);const f=new Gf(h,d);l.add(f)}return l}}const r_={type:"change"},jm={type:"start"},Hy={type:"end"},Vu=new Md,s_=new bs,yP=Math.cos(70*bb.DEG2RAD),Sn=new ne,ci=2*Math.PI,Xt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},ep=1e-6;class SP extends xT{constructor(e,t=null){super(e,t),this.state=Xt.NONE,this.target=new ne,this.cursor=new ne,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:xo.ROTATE,MIDDLE:xo.DOLLY,RIGHT:xo.PAN},this.touches={ONE:mo.ROTATE,TWO:mo.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new ne,this._lastQuaternion=new zs,this._lastTargetPosition=new ne,this._quat=new zs().setFromUnitVectors(e.up,new ne(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Rv,this._sphericalDelta=new Rv,this._scale=1,this._panOffset=new ne,this._rotateStart=new dt,this._rotateEnd=new dt,this._rotateDelta=new dt,this._panStart=new dt,this._panEnd=new dt,this._panDelta=new dt,this._dollyStart=new dt,this._dollyEnd=new dt,this._dollyDelta=new dt,this._dollyDirection=new ne,this._mouse=new dt,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=EP.bind(this),this._onPointerDown=MP.bind(this),this._onPointerUp=wP.bind(this),this._onContextMenu=NP.bind(this),this._onMouseWheel=CP.bind(this),this._onKeyDown=RP.bind(this),this._onTouchStart=AP.bind(this),this._onTouchMove=PP.bind(this),this._onMouseDown=bP.bind(this),this._onMouseMove=TP.bind(this),this._interceptControlDown=LP.bind(this),this._interceptControlUp=DP.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(r_),this.update(),this.state=Xt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;Sn.copy(t).sub(this.target),Sn.applyQuaternion(this._quat),this._spherical.setFromVector3(Sn),this.autoRotate&&this.state===Xt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=ci:r>Math.PI&&(r-=ci),a<-Math.PI?a+=ci:a>Math.PI&&(a-=ci),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(Sn.setFromSpherical(this._spherical),Sn.applyQuaternion(this._quatInverse),t.copy(this.target).add(Sn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=Sn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new ne(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new ne(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=Sn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Vu.origin.copy(this.object.position),Vu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Vu.direction))<yP?this.object.lookAt(this.target):(s_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Vu.intersectPlane(s_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>ep||8*(1-this._lastQuaternion.dot(this.object.quaternion))>ep||this._lastTargetPosition.distanceToSquared(this.target)>ep?(this.dispatchEvent(r_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ci/60*this.autoRotateSpeed*e:ci/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){Sn.setFromMatrixColumn(t,0),Sn.multiplyScalar(-e),this._panOffset.add(Sn)}_panUp(e,t){this.screenSpacePanning===!0?Sn.setFromMatrixColumn(t,1):(Sn.setFromMatrixColumn(t,0),Sn.crossVectors(this.object.up,Sn)),Sn.multiplyScalar(e),this._panOffset.add(Sn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;Sn.copy(a).sub(this.target);let l=Sn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new dt,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function MP(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function EP(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function wP(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Hy),this.state=Xt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function bP(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case xo.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=Xt.DOLLY;break;case xo.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xt.ROTATE}break;case xo.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=Xt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=Xt.PAN}break;default:this.state=Xt.NONE}this.state!==Xt.NONE&&this.dispatchEvent(jm)}function TP(i){switch(this.state){case Xt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case Xt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case Xt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function CP(i){this.enabled===!1||this.enableZoom===!1||this.state!==Xt.NONE||(i.preventDefault(),this.dispatchEvent(jm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(Hy))}function RP(i){this.enabled!==!1&&this._handleKeyDown(i)}function AP(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case mo.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=Xt.TOUCH_ROTATE;break;case mo.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=Xt.TOUCH_PAN;break;default:this.state=Xt.NONE}break;case 2:switch(this.touches.TWO){case mo.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=Xt.TOUCH_DOLLY_PAN;break;case mo.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=Xt.TOUCH_DOLLY_ROTATE;break;default:this.state=Xt.NONE}break;default:this.state=Xt.NONE}this.state!==Xt.NONE&&this.dispatchEvent(jm)}function PP(i){switch(this._trackPointer(i),this.state){case Xt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case Xt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case Xt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case Xt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=Xt.NONE}}function NP(i){this.enabled!==!1&&i.preventDefault()}function LP(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function DP(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function IP({piece:i,textured:e=!0,size:t=320}){const r=k.useRef(null);return k.useEffect(()=>{const a=r.current;if(!a)return;const l=new zb;l.background=new vt(1315866);const c=new Ii(35,1,.01,5e3),d=new fP({antialias:!0});d.setSize(t,t),d.setPixelRatio(Math.min(2,window.devicePixelRatio)),d.outputColorSpace=Jn,d.toneMapping=Nm,d.toneMappingExposure=1.15,a.appendChild(d.domElement),l.add(new dT(16777215,4210768,1.1)),l.add(new pT(16777215,.35));const h=new Xf(16777215,2.4);h.position.set(3,4,2),l.add(h);const f=new Xf(16777215,1.1);f.position.set(-3,1,-1),l.add(f);const x=new Xf(16777215,.8);x.position.set(0,2,-4),l.add(x);const p=new SP(c,d.domElement);p.enableDamping=!0,p.autoRotate=!0,p.autoRotateSpeed=1.2;let v=0,_=!1;new _P().load(`/api/scan/model/${i}.obj`,M=>{if(_)return;M.traverse(N=>{const U=N;U.isMesh&&U.geometry.computeVertexNormals()});const S=N=>UP(M,N);e?new uT().load(`/api/scan/model/${i}.png`,N=>{N.colorSpace=Jn,S(new jf({map:N,roughness:.6}))},void 0,()=>S(new jf({color:11579576,roughness:.6}))):S(new jf({color:12632262,roughness:.65})),M.rotation.x=-Math.PI/2;const A=new Go().setFromObject(M),L=A.getCenter(new ne),C=A.getSize(new ne);M.position.sub(L),l.add(M);const I=Math.max(C.x,C.y,C.z);c.position.set(I*1.6,I*.6,I*1.6),c.near=I/100,c.far=I*100,c.updateProjectionMatrix(),p.target.set(0,0,0),p.update()});const w=()=>{p.update(),d.render(l,c),v=requestAnimationFrame(w)};return w(),()=>{_=!0,cancelAnimationFrame(v),p.dispose(),d.dispose(),a.removeChild(d.domElement)}},[i,e,t]),m.jsx("div",{ref:r,style:{width:t,height:t},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function UP(i,e){e.side=hr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const Es="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",FP="https://192.168.178.23:4444/video/snapshot",kP={P:"Bauer",N:"Springer",B:"Läufer",R:"Turm",Q:"Dame",K:"König"};function OP(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function hd(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"weiß ":"schwarz "),t+(kP[e]??i)}function dm(i,e){const t=OP(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece}:i.mesh?{stage:"mesh",piece:t}:{stage:"mesh",piece:t}}function zP(){const[i,e]=k.useState(FP),[t,r]=k.useState(3840),[a,l]=k.useState(2160),[c,d]=k.useState("pawn"),[h,f]=k.useState(.8),[x,p]=k.useState(80),[v,_]=k.useState(92),[E,w]=k.useState(null),[M,S]=k.useState(""),[A,L]=k.useState(null),C=k.useRef(null),I=k.useRef(null),[N,U]=k.useState(null),[b,D]=k.useState(""),[O,V]=k.useState("P"),[W,j]=k.useState(null),[ue,q]=k.useState("textured"),[pe,J]=k.useState(null),[K,re]=k.useState(null),[he,z]=k.useState(null),[ie,Ie]=k.useState(""),[je,He]=k.useState(!1),H=k.useRef(null);k.useEffect(()=>($t("/api/scan/status").then(de=>{w(de),de.default_source&&e(de.default_source),de.out&&d(de.out)}).catch(()=>{}),()=>clearInterval(I.current)),[]);const ve=()=>$t("/api/scan/status").then(w).catch(()=>{});function fe(){clearInterval(I.current),I.current=setInterval(ve,1e3)}async function te(){S("");try{const de=await Pt("/api/scan/open",{source:i,width:t,height:a});w(de),fe()}catch(de){S("Fehler: "+de.message)}}async function Fe(){const de=await Pt("/api/scan/close");w(de),clearInterval(I.current)}function Xe(de){const Ue=C.current.getBoundingClientRect();return{x:de.clientX-Ue.left,y:de.clientY-Ue.top,r:Ue}}function kt(de){if(!(E!=null&&E.open))return;de.target.setPointerCapture(de.pointerId);const{x:Ue,y:Ce}=Xe(de);L({x0:Ue,y0:Ce,x1:Ue,y1:Ce})}function ct(de){if(!A)return;const{x:Ue,y:Ce}=Xe(de);L({...A,x1:Ue,y1:Ce})}async function Nt(){if(!A||!E)return L(null);const de=C.current.getBoundingClientRect(),[Ue,Ce]=E.frame_size,Ae=Ue/de.width,Je=Ce/de.height,it=Math.round(Math.min(A.x0,A.x1)*Ae),st=Math.round(Math.min(A.y0,A.y1)*Je),$=Math.round(Math.max(A.x0,A.x1)*Ae),Le=Math.round(Math.max(A.y0,A.y1)*Je);L(null),!($-it<10||Le-st<10)&&w(await Pt("/api/scan/config",{crop:[it,st,$,Le]}))}async function bt(){w(await Pt("/api/scan/config",{crop:[]}))}async function yt(){w(await Pt("/api/scan/config",{interval:h,count:x,quality:v,out:c}))}async function qt(){S("");try{await yt();const de=await Pt("/api/scan/start",{out:c});w(de),fe()}catch(de){S("Fehler: "+de.message)}}const nn=async()=>w(await Pt("/api/scan/stop")),jt=()=>$t("/api/scan/models").then(de=>{U(de),!b&&de.scans.length&&Kt(de.scans[0],de.pieces)}).catch(()=>{});function Kt(de,Ue=(N==null?void 0:N.pieces)??[]){D(de.dir);const{piece:Ce}=dm(de,Ue);V(Ce??"P")}async function It(de){confirm(`Scan „${de}" mit Mesh wirklich löschen?`)&&(await Wl(`/api/scan/scan/${de}`).catch(()=>{}),b===de&&D(""),jt())}async function Yt(de){confirm(`Vorbereitete Figur „${de}" löschen? (Der Scan bleibt erhalten.)`)&&(await Wl(`/api/scan/piece/${de}`).catch(()=>{}),j(null),jt())}async function Q(){var de;if(!(!K||!ie)){He(!0),S("");try{const Ue=new FormData;Ue.append("name",ie),Ue.append("mesh",K),he&&Ue.append("texture",he);const Ce=await fetch("/api/scan/upload",{method:"POST",body:Ue});if(!Ce.ok)throw new Error(((de=await Ce.json())==null?void 0:de.detail)||`HTTP ${Ce.status}`);await jt(),D(ie),Ie(""),re(null),z(null)}catch(Ue){S("Upload: "+Ue.message)}He(!1)}}const mn=()=>$t("/api/scan/prepare/status").then(de=>{j(de),de.state!=="running"&&(clearInterval(H.current),jt())}).catch(()=>{});k.useEffect(()=>(jt(),$t("/api/scan/prepare/status").then(de=>{de.state==="running"&&(j(de),H.current=setInterval(mn,2e3))}).catch(()=>{}),()=>{clearInterval(H.current)}),[]);async function Rt(){S("");try{await Pt("/api/scan/prepare",{dir:b,piece:O}),j({state:"running",piece:O}),clearInterval(H.current),H.current=setInterval(mn,2e3)}catch(de){S("Fehler: "+de.message)}}const F=E==null?void 0:E.recording,T=A&&{left:Math.min(A.x0,A.x1),top:Math.min(A.y0,A.y1),width:Math.abs(A.x1-A.x0),height:Math.abs(A.y1-A.y0)},ee=(N==null?void 0:N.scans)??[],ae=ee.find(de=>de.dir===b),xe=ae?dm(ae,(N==null?void 0:N.pieces)??[]):null,Te=xe==null?void 0:xe.stage,Ne=(W==null?void 0:W.state)==="running",_e=Te==="done"?2:1;let ye;return Ne?ye="läuft…":Te==="done"?ye="Neu vorbereiten":ye="Vorbereiten",(xe==null?void 0:xe.stage)==="done"?xe.piece:(W==null?void 0:W.state)==="done"&&W.piece,m.jsxs("div",{className:"space-y-4",children:[m.jsx(Ft,{children:m.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Quelle",m.jsx("input",{value:i,onChange:de=>e(de.target.value),className:`${Es} w-96`,placeholder:"IP-Cam-URL oder USB-Index (0/1)"})]}),m.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Nur für USB-Cam: angeforderte Auflösung (MJPG).",children:["USB-Res",m.jsx("input",{type:"number",value:t,onChange:de=>r(+de.target.value),className:`${Es} w-20`}),"×",m.jsx("input",{type:"number",value:a,onChange:de=>l(+de.target.value),className:`${Es} w-20`})]}),E!=null&&E.open?m.jsxs(mt,{onClick:Fe,children:[m.jsx(Vx,{className:"h-4 w-4"})," Trennen"]}):m.jsxs(mt,{variant:"primary",onClick:te,children:[m.jsx(Vx,{className:"h-4 w-4"})," Verbinden"]}),m.jsxs("span",{className:"text-xs text-zinc-500",children:[M,E!=null&&E.error?` · ${E.error}`:""]})]})}),(E==null?void 0:E.open)&&m.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[m.jsxs(Ft,{title:"Live · Crop mit der Maus aufziehen",children:[m.jsxs("div",{className:"relative inline-block select-none leading-none",children:[m.jsx("img",{ref:C,src:"/api/scan/preview.mjpg",alt:"Scan Vorschau",draggable:!1,className:"w-full rounded-lg border border-zinc-800"}),m.jsx("div",{className:"absolute inset-0 cursor-crosshair",onPointerDown:kt,onPointerMove:ct,onPointerUp:Nt,children:T&&m.jsx("div",{className:"absolute border-2 border-sky-400 bg-sky-400/10",style:{left:T.left,top:T.top,width:T.width,height:T.height}})})]}),m.jsxs("div",{className:"mt-2 flex items-center gap-3 text-xs text-zinc-500",children:[m.jsxs("span",{children:["Quelle ",E.frame_size[0],"×",E.frame_size[1]]}),m.jsxs("span",{children:["Crop: ",E.crop?E.crop.join(", "):"—"]}),m.jsxs(mt,{onClick:bt,className:"px-2 py-1 text-xs",children:[m.jsx(yw,{className:"h-3 w-3"})," Crop zurücksetzen"]})]})]}),m.jsx(Ft,{title:"Aufnahme",children:m.jsxs("div",{className:"space-y-3",children:[m.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["Ziel-Ordner",m.jsx("input",{value:c,onChange:de=>d(de.target.value),className:`${Es} w-40`})]}),m.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Sekunden zwischen zwei Fotos. Beim Handy ist ~0.8s das Limit (HTTPS-Fetch).",children:["Intervall (s)",m.jsx("input",{type:"number",step:.1,min:0,value:h,onChange:de=>f(+de.target.value),className:`${Es} w-24`})]}),m.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",title:"Fotos pro Aufnahme-Lauf. 0 = bis Stop.",children:["Anzahl (0=∞)",m.jsx("input",{type:"number",min:0,value:x,onChange:de=>p(+de.target.value),className:`${Es} w-24`})]}),m.jsxs("label",{className:"flex items-center justify-between gap-2 text-sm text-zinc-400",children:["JPEG-Qualität",m.jsx("input",{type:"number",min:50,max:100,value:v,onChange:de=>_(+de.target.value),className:`${Es} w-24`})]}),m.jsxs("div",{className:"flex flex-wrap gap-2 pt-1",children:[F?m.jsxs(mt,{onClick:nn,children:[m.jsx(ny,{className:"h-4 w-4"})," Stop"]}):m.jsxs(mt,{variant:"primary",onClick:qt,children:[m.jsx(yd,{className:"h-4 w-4"})," Aufnahme starten"]}),m.jsxs(mt,{onClick:yt,title:"Intervall/Anzahl/Qualität übernehmen ohne Aufnahme",children:[m.jsx(uw,{className:"h-4 w-4"})," Übernehmen"]})]}),m.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[F?m.jsxs("span",{className:"font-medium text-green-500",children:["● Aufnahme läuft — ",E.saved_run,E.count?` / ${E.count}`:""," Fotos"]}):m.jsx("span",{className:"text-zinc-400",children:"bereit"}),m.jsxs("div",{className:"mt-1 text-xs text-zinc-500",children:["Im Ordner ",m.jsx("b",{className:"text-zinc-300",children:E.out||c}),": ",E.total," Fotos gesamt (nächste Nr. ",E.index,")"]})]}),m.jsxs("p",{className:"text-xs text-zinc-500",children:["Motor an, Handy/Cam ",m.jsx("b",{children:"fest"}),', Hände weg. „Aufnahme starten" hängt an bestehende Fotos an (Ring 2/3 einfach neu positionieren + wieder starten).']})]})})]}),!(E!=null&&E.open)&&m.jsxs("p",{className:"text-xs text-zinc-500",children:["Verbinde eine Quelle (Handy-IP-Cam-URL oder USB-Index), zieh im Live-Bild den ",m.jsx("b",{children:"Crop"})," um Figur + Drehteller (statischer Hintergrund raus), stell ",m.jsx("b",{children:"Intervall"})," und ",m.jsx("b",{children:"Anzahl"})," ein und nimm auf. Die Fotos landen in ",m.jsx("b",{children:"scans/<Ordner>"})," — bereit für RealityScan."]}),m.jsxs(Ft,{title:"Figuren-Werkstatt — 3D-Scan → Figur",children:[m.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",ry],[2,"Vorbereiten",_p]].map(([de,Ue,Ce],Ae)=>m.jsxs("div",{className:"flex items-center gap-1",children:[m.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${_e>=de?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[m.jsx(Ce,{className:"h-3.5 w-3.5"})," ",m.jsx("span",{children:Ue})]}),Ae<1&&m.jsx("div",{className:`h-px w-4 ${_e>de?"bg-sky-500/40":"bg-zinc-700"}`})]},de))}),ee.length===0&&m.jsx("p",{className:"text-sm text-zinc-500",children:"Noch keine Scans. Lade ein 3D-Modell (.obj/.glb) hoch — es erscheint dann hier als Karte."}),m.jsx(BP,{uploadName:ie,setUploadName:Ie,meshFile:K,setMeshFile:re,texFile:he,setTexFile:z,uploading:je,doUpload:Q,input:Es}),m.jsx(HP,{scans:ee,models:N,dir:b,selectScan:Kt,deleteScan:It,prep:W}),ae&&m.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[m.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[m.jsxs("div",{className:"flex items-center gap-2",children:[m.jsxs("div",{children:[m.jsx("div",{className:"text-sm font-medium text-zinc-100",children:ae.dir}),m.jsxs("div",{className:"text-xs text-zinc-500",children:[ae.mesh?"Mesh vorhanden":"noch kein Mesh",!ae.texture&&ae.mesh?" · ⚠ ohne Textur":""]})]}),m.jsx("button",{onClick:()=>It(ae.dir),title:"Scan löschen",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:m.jsx(Vo,{className:"h-4 w-4"})})]}),m.jsxs(mt,{variant:"primary",onClick:Rt,disabled:Ne,children:[Ne?m.jsx(Ca,{className:"h-4 w-4 animate-spin"}):m.jsx(_p,{className:"h-4 w-4"}),ye]})]}),m.jsx(GP,{cur:ae,busyPrep:Ne,prep:W}),M&&m.jsx("p",{className:"mt-2 text-sm text-red-400",children:M})]}),m.jsx(jP,{pieces:N==null?void 0:N.pieces,setView3d:J,deletePiece:Yt,prep:W,variant:ue,setVariant:q})]}),pe&&m.jsx(VP,{piece:pe,textured:ue==="textured",onClose:()=>J(null)})]})}function BP({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return m.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[m.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"3D-Modell hochladen (.obj/.glb)"}),m.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[m.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",m.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"z.B. wK",className:`${h} w-32`})]}),m.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",m.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var x;return r(((x=f.target.files)==null?void 0:x[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),m.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Textur (optional)",m.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var x;return l(((x=f.target.files)==null?void 0:x[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),m.jsxs(mt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?m.jsx(Ca,{className:"h-4 w-4 animate-spin"}):m.jsx(ry,{className:"h-4 w-4"}),"Hochladen"]})]})]})}function HP({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return m.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var _;const d=dm(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,x=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((_=e==null?void 0:e.jobs)==null?void 0:_.prepare)===c.dir,p=x?["wird vorbereitet…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh bereit","bg-sky-500/15 text-sky-300"],done:["Fertig","bg-green-500/15 text-green-300"]}[d.stage],v=d.piece&&d.stage==="done";return m.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[m.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[v?m.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}`,alt:`${hd(d.piece)} Vorschau`,className:"h-full w-full object-contain"}):m.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:m.jsx(wa,{className:"h-8 w-8"})}),m.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${p[1]}`,children:[x&&m.jsx(Ca,{className:"h-3 w-3 animate-spin"}),p[0]]}),m.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Scan-Ordner löschen",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:m.jsx(Vo,{className:"h-3.5 w-3.5"})})]}),m.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),m.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?`${hd(d.piece)}`:""})]},c.dir)})})}function VP({piece:i,textured:e,onClose:t}){const[r,a]=k.useState(e);return k.useEffect(()=>{const l=c=>c.key==="Escape"&&t();return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[t]),m.jsx("div",{onClick:t,role:"button",tabIndex:0,onKeyDown:l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),t())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:m.jsxs("div",{onClick:l=>l.stopPropagation(),role:"presentation",onKeyDown:l=>l.stopPropagation(),className:"flex flex-col items-center gap-3",children:[m.jsx(IP,{piece:i,textured:r,size:Math.min(720,window.innerHeight-160)}),m.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[m.jsx("span",{className:"font-medium",children:i}),m.jsx(Vy,{value:r?"textured":"clay",onChange:l=>a(l==="textured")}),m.jsx("span",{className:"text-xs text-zinc-500",children:"ziehen = drehen · Rad = zoomen · Esc = schließen"})]})]})})}function GP({cur:i,busyPrep:e,prep:t}){return m.jsxs(m.Fragment,{children:[e&&m.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[m.jsx(Ca,{className:"h-4 w-4 animate-spin"})," Figur wird vorbereitet — ca. 1–3 min…"]}),(t==null?void 0:t.state)==="failed"&&m.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[m.jsxs("div",{className:"flex items-center gap-2",children:[m.jsx(Rm,{className:"h-4 w-4"})," Vorbereitung fehlgeschlagen."]}),t.log_tail&&m.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function jP({pieces:i,setView3d:e,deletePiece:t,prep:r,variant:a,setVariant:l}){return i!=null&&i.length?m.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[m.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Fertige Figuren (synth_pieces/)"}),m.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece;return m.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[m.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?m.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}${a==="clay"?"?variant=clay":""}`,alt:`${hd(c.piece)}`,className:"h-full w-full object-contain"}):m.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:m.jsx(gw,{className:"h-8 w-8"})}),m.jsx("button",{onClick:()=>e(c.piece),title:"3D-Ansicht öffnen",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:m.jsx(vw,{className:"h-3.5 w-3.5"})})]}),m.jsxs("div",{className:"flex items-center justify-between",children:[m.jsx("span",{className:"text-sm font-medium text-zinc-200",children:hd(c.piece)}),d&&m.jsx(Ca,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),m.jsx(Vy,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&m.jsx(WP,{piece:c.piece,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.piece)})})]}):null}function WP({piece:i,report:e,level:t,messages:r,onDelete:a}){return!e||!e.tris?null:m.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[t&&m.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${t==="ok"?"text-green-400":"text-amber-400"}`,children:[t==="ok"?m.jsx(_d,{className:"h-4 w-4"}):m.jsx(Rm,{className:"h-4 w-4"}),t==="ok"?"Qualität OK":"Bitte prüfen"]}),(r??[]).map((l,c)=>m.jsxs("div",{className:"text-amber-300/90",children:["• ",l]},c)),m.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[m.jsx("span",{className:"text-zinc-500",children:"Dreiecke"}),m.jsx("span",{children:e.tris}),m.jsx("span",{className:"text-zinc-500",children:"offene Kanten"}),m.jsx("span",{children:e.boundary_edges}),m.jsx("span",{className:"text-zinc-500",children:"Höhe/Basis"}),m.jsx("span",{children:e.height_ratio})]}),m.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,".obj"]}),m.jsxs("button",{onClick:()=>a(i),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[m.jsx(Vo,{className:"h-3.5 w-3.5"})," Figur löschen"]})]})}function Vy({value:i,onChange:e,clayDisabled:t}){return m.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[m.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textur"}),m.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"kein Clay-Bild (Figur vor diesem Update vorbereitet)":"reine Geometrie",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const XP=[{to:"/kalibrieren",label:"Kalibrieren",icon:dw},{to:"/sammeln",label:"Sammeln",icon:wa},{to:"/scan",label:"Scan",icon:rw},{to:"/manuell",label:"Manuell labeln",icon:mw},{to:"/datensaetze",label:"Datensätze",icon:fw},{to:"/inference",label:"Inference",icon:J_},{to:"/review",label:"Review / Relabel",icon:Mw},{to:"/training",label:"Training",icon:aw}],$P=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function qP(){return m.jsx(V1,{children:m.jsxs("div",{className:"min-h-full",children:[m.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:m.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[m.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[m.jsx(hw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),m.jsx("nav",{className:"flex flex-wrap gap-1",children:XP.map(i=>{const e=i.icon;return m.jsxs(go,{to:i.to,className:$P,children:[m.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),m.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:m.jsxs(x1,{children:[m.jsx(Kn,{path:"/",element:m.jsx(hf,{to:"/kalibrieren",replace:!0})}),m.jsx(Kn,{path:"/kalibrieren",element:m.jsx(bw,{})}),m.jsx(Kn,{path:"/sammeln",element:m.jsx(Cw,{})}),m.jsx(Kn,{path:"/scan",element:m.jsx(zP,{})}),m.jsx(Kn,{path:"/manuell",element:m.jsx(Lw,{})}),m.jsxs(Kn,{path:"/datensaetze",element:m.jsx(Dw,{}),children:[m.jsx(Kn,{index:!0,element:m.jsx(hf,{to:"sessions",replace:!0})}),m.jsx(Kn,{path:"sessions",element:m.jsx(Iw,{})}),m.jsx(Kn,{path:"kuratiert",element:m.jsx(Uw,{})}),m.jsx(Kn,{path:"statistik",element:m.jsx(Fw,{})})]}),m.jsx(Kn,{path:"/inference",element:m.jsx(Hw,{})}),m.jsx(Kn,{path:"/review",element:m.jsx(zw,{})}),m.jsx(Kn,{path:"/training",element:m.jsx(Bw,{})}),m.jsx(Kn,{path:"*",element:m.jsx(hf,{to:"/kalibrieren",replace:!0})})]})})]})})}const KP=new iE({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});NM.createRoot(document.getElementById("root")).render(m.jsx(bM.StrictMode,{children:m.jsx(rE,{client:KP,children:m.jsx(qP,{})})}));
