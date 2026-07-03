var hx=i=>{throw TypeError(i)};var tf=(i,e,t)=>e.has(i)||hx("Cannot "+t);var G=(i,e,t)=>(tf(i,e,"read from private field"),t?t.call(i):e.get(i)),it=(i,e,t)=>e.has(i)?hx("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),ze=(i,e,t,r)=>(tf(i,e,"write to private field"),r?r.call(i,t):e.set(i,t),t),mt=(i,e,t)=>(tf(i,e,"access private method"),t);var cu=(i,e,t,r)=>({set _(a){ze(i,e,a,t)},get _(){return G(i,e,r)}});(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const c of l.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&r(c)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function r(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();function _M(i){return i&&i.__esModule&&Object.prototype.hasOwnProperty.call(i,"default")?i.default:i}var nf={exports:{}},bl={},rf={exports:{}},St={};/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var fx;function yM(){if(fx)return St;fx=1;var i=Symbol.for("react.element"),e=Symbol.for("react.portal"),t=Symbol.for("react.fragment"),r=Symbol.for("react.strict_mode"),a=Symbol.for("react.profiler"),l=Symbol.for("react.provider"),c=Symbol.for("react.context"),d=Symbol.for("react.forward_ref"),h=Symbol.for("react.suspense"),f=Symbol.for("react.memo"),g=Symbol.for("react.lazy"),p=Symbol.iterator;function v(F){return F===null||typeof F!="object"?null:(F=p&&F[p]||F["@@iterator"],typeof F=="function"?F:null)}var _={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},E=Object.assign,b={};function M(F,ee,Ce){this.props=F,this.context=ee,this.refs=b,this.updater=Ce||_}M.prototype.isReactComponent={},M.prototype.setState=function(F,ee){if(typeof F!="object"&&typeof F!="function"&&F!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,F,ee,"setState")},M.prototype.forceUpdate=function(F){this.updater.enqueueForceUpdate(this,F,"forceUpdate")};function S(){}S.prototype=M.prototype;function P(F,ee,Ce){this.props=F,this.context=ee,this.refs=b,this.updater=Ce||_}var L=P.prototype=new S;L.constructor=P,E(L,M.prototype),L.isPureReactComponent=!0;var C=Array.isArray,I=Object.prototype.hasOwnProperty,N={current:null},U={key:!0,ref:!0,__self:!0,__source:!0};function w(F,ee,Ce){var Ve,Ge={},V=null,xe=null;if(ee!=null)for(Ve in ee.ref!==void 0&&(xe=ee.ref),ee.key!==void 0&&(V=""+ee.key),ee)I.call(ee,Ve)&&!U.hasOwnProperty(Ve)&&(Ge[Ve]=ee[Ve]);var fe=arguments.length-2;if(fe===1)Ge.children=Ce;else if(1<fe){for(var ne=Array(fe),Le=0;Le<fe;Le++)ne[Le]=arguments[Le+2];Ge.children=ne}if(F&&F.defaultProps)for(Ve in fe=F.defaultProps,fe)Ge[Ve]===void 0&&(Ge[Ve]=fe[Ve]);return{$$typeof:i,type:F,key:V,ref:xe,props:Ge,_owner:N.current}}function D(F,ee){return{$$typeof:i,type:F.type,key:ee,ref:F.ref,props:F.props,_owner:F._owner}}function z(F){return typeof F=="object"&&F!==null&&F.$$typeof===i}function H(F){var ee={"=":"=0",":":"=2"};return"$"+F.replace(/[=:]/g,function(Ce){return ee[Ce]})}var X=/\/+/g;function j(F,ee){return typeof F=="object"&&F!==null&&F.key!=null?H(""+F.key):ee.toString(36)}function le(F,ee,Ce,Ve,Ge){var V=typeof F;(V==="undefined"||V==="boolean")&&(F=null);var xe=!1;if(F===null)xe=!0;else switch(V){case"string":case"number":xe=!0;break;case"object":switch(F.$$typeof){case i:case e:xe=!0}}if(xe)return xe=F,Ge=Ge(xe),F=Ve===""?"."+j(xe,0):Ve,C(Ge)?(Ce="",F!=null&&(Ce=F.replace(X,"$&/")+"/"),le(Ge,ee,Ce,"",function(Le){return Le})):Ge!=null&&(z(Ge)&&(Ge=D(Ge,Ce+(!Ge.key||xe&&xe.key===Ge.key?"":(""+Ge.key).replace(X,"$&/")+"/")+F)),ee.push(Ge)),1;if(xe=0,Ve=Ve===""?".":Ve+":",C(F))for(var fe=0;fe<F.length;fe++){V=F[fe];var ne=Ve+j(V,fe);xe+=le(V,ee,Ce,ne,Ge)}else if(ne=v(F),typeof ne=="function")for(F=ne.call(F),fe=0;!(V=F.next()).done;)V=V.value,ne=Ve+j(V,fe++),xe+=le(V,ee,Ce,ne,Ge);else if(V==="object")throw ee=String(F),Error("Objects are not valid as a React child (found: "+(ee==="[object Object]"?"object with keys {"+Object.keys(F).join(", ")+"}":ee)+"). If you meant to render a collection of children, use an array instead.");return xe}function $(F,ee,Ce){if(F==null)return F;var Ve=[],Ge=0;return le(F,Ve,"","",function(V){return ee.call(Ce,V,Ge++)}),Ve}function ue(F){if(F._status===-1){var ee=F._result;ee=ee(),ee.then(function(Ce){(F._status===0||F._status===-1)&&(F._status=1,F._result=Ce)},function(Ce){(F._status===0||F._status===-1)&&(F._status=2,F._result=Ce)}),F._status===-1&&(F._status=0,F._result=ee)}if(F._status===1)return F._result.default;throw F._result}var J={current:null},K={transition:null},re={ReactCurrentDispatcher:J,ReactCurrentBatchConfig:K,ReactCurrentOwner:N};function de(){throw Error("act(...) is not supported in production builds of React.")}return St.Children={map:$,forEach:function(F,ee,Ce){$(F,function(){ee.apply(this,arguments)},Ce)},count:function(F){var ee=0;return $(F,function(){ee++}),ee},toArray:function(F){return $(F,function(ee){return ee})||[]},only:function(F){if(!z(F))throw Error("React.Children.only expected to receive a single React element child.");return F}},St.Component=M,St.Fragment=t,St.Profiler=a,St.PureComponent=P,St.StrictMode=r,St.Suspense=h,St.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=re,St.act=de,St.cloneElement=function(F,ee,Ce){if(F==null)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+F+".");var Ve=E({},F.props),Ge=F.key,V=F.ref,xe=F._owner;if(ee!=null){if(ee.ref!==void 0&&(V=ee.ref,xe=N.current),ee.key!==void 0&&(Ge=""+ee.key),F.type&&F.type.defaultProps)var fe=F.type.defaultProps;for(ne in ee)I.call(ee,ne)&&!U.hasOwnProperty(ne)&&(Ve[ne]=ee[ne]===void 0&&fe!==void 0?fe[ne]:ee[ne])}var ne=arguments.length-2;if(ne===1)Ve.children=Ce;else if(1<ne){fe=Array(ne);for(var Le=0;Le<ne;Le++)fe[Le]=arguments[Le+2];Ve.children=fe}return{$$typeof:i,type:F.type,key:Ge,ref:V,props:Ve,_owner:xe}},St.createContext=function(F){return F={$$typeof:c,_currentValue:F,_currentValue2:F,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},F.Provider={$$typeof:l,_context:F},F.Consumer=F},St.createElement=w,St.createFactory=function(F){var ee=w.bind(null,F);return ee.type=F,ee},St.createRef=function(){return{current:null}},St.forwardRef=function(F){return{$$typeof:d,render:F}},St.isValidElement=z,St.lazy=function(F){return{$$typeof:g,_payload:{_status:-1,_result:F},_init:ue}},St.memo=function(F,ee){return{$$typeof:f,type:F,compare:ee===void 0?null:ee}},St.startTransition=function(F){var ee=K.transition;K.transition={};try{F()}finally{K.transition=ee}},St.unstable_act=de,St.useCallback=function(F,ee){return J.current.useCallback(F,ee)},St.useContext=function(F){return J.current.useContext(F)},St.useDebugValue=function(){},St.useDeferredValue=function(F){return J.current.useDeferredValue(F)},St.useEffect=function(F,ee){return J.current.useEffect(F,ee)},St.useId=function(){return J.current.useId()},St.useImperativeHandle=function(F,ee,Ce){return J.current.useImperativeHandle(F,ee,Ce)},St.useInsertionEffect=function(F,ee){return J.current.useInsertionEffect(F,ee)},St.useLayoutEffect=function(F,ee){return J.current.useLayoutEffect(F,ee)},St.useMemo=function(F,ee){return J.current.useMemo(F,ee)},St.useReducer=function(F,ee,Ce){return J.current.useReducer(F,ee,Ce)},St.useRef=function(F){return J.current.useRef(F)},St.useState=function(F){return J.current.useState(F)},St.useSyncExternalStore=function(F,ee,Ce){return J.current.useSyncExternalStore(F,ee,Ce)},St.useTransition=function(){return J.current.useTransition()},St.version="18.3.1",St}var px;function dm(){return px||(px=1,rf.exports=yM()),rf.exports}/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var mx;function SM(){if(mx)return bl;mx=1;var i=dm(),e=Symbol.for("react.element"),t=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,a=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,l={key:!0,ref:!0,__self:!0,__source:!0};function c(d,h,f){var g,p={},v=null,_=null;f!==void 0&&(v=""+f),h.key!==void 0&&(v=""+h.key),h.ref!==void 0&&(_=h.ref);for(g in h)r.call(h,g)&&!l.hasOwnProperty(g)&&(p[g]=h[g]);if(d&&d.defaultProps)for(g in h=d.defaultProps,h)p[g]===void 0&&(p[g]=h[g]);return{$$typeof:e,type:d,key:v,ref:_,props:p,_owner:a.current}}return bl.Fragment=t,bl.jsx=c,bl.jsxs=c,bl}var gx;function MM(){return gx||(gx=1,nf.exports=SM()),nf.exports}var x=MM(),k=dm();const EM=_M(k);var uu={},sf={exports:{}},oi={},af={exports:{}},of={};/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var xx;function wM(){return xx||(xx=1,(function(i){function e(K,re){var de=K.length;K.push(re);e:for(;0<de;){var F=de-1>>>1,ee=K[F];if(0<a(ee,re))K[F]=re,K[de]=ee,de=F;else break e}}function t(K){return K.length===0?null:K[0]}function r(K){if(K.length===0)return null;var re=K[0],de=K.pop();if(de!==re){K[0]=de;e:for(var F=0,ee=K.length,Ce=ee>>>1;F<Ce;){var Ve=2*(F+1)-1,Ge=K[Ve],V=Ve+1,xe=K[V];if(0>a(Ge,de))V<ee&&0>a(xe,Ge)?(K[F]=xe,K[V]=de,F=V):(K[F]=Ge,K[Ve]=de,F=Ve);else if(V<ee&&0>a(xe,de))K[F]=xe,K[V]=de,F=V;else break e}}return re}function a(K,re){var de=K.sortIndex-re.sortIndex;return de!==0?de:K.id-re.id}if(typeof performance=="object"&&typeof performance.now=="function"){var l=performance;i.unstable_now=function(){return l.now()}}else{var c=Date,d=c.now();i.unstable_now=function(){return c.now()-d}}var h=[],f=[],g=1,p=null,v=3,_=!1,E=!1,b=!1,M=typeof setTimeout=="function"?setTimeout:null,S=typeof clearTimeout=="function"?clearTimeout:null,P=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function L(K){for(var re=t(f);re!==null;){if(re.callback===null)r(f);else if(re.startTime<=K)r(f),re.sortIndex=re.expirationTime,e(h,re);else break;re=t(f)}}function C(K){if(b=!1,L(K),!E)if(t(h)!==null)E=!0,ue(I);else{var re=t(f);re!==null&&J(C,re.startTime-K)}}function I(K,re){E=!1,b&&(b=!1,S(w),w=-1),_=!0;var de=v;try{for(L(re),p=t(h);p!==null&&(!(p.expirationTime>re)||K&&!H());){var F=p.callback;if(typeof F=="function"){p.callback=null,v=p.priorityLevel;var ee=F(p.expirationTime<=re);re=i.unstable_now(),typeof ee=="function"?p.callback=ee:p===t(h)&&r(h),L(re)}else r(h);p=t(h)}if(p!==null)var Ce=!0;else{var Ve=t(f);Ve!==null&&J(C,Ve.startTime-re),Ce=!1}return Ce}finally{p=null,v=de,_=!1}}var N=!1,U=null,w=-1,D=5,z=-1;function H(){return!(i.unstable_now()-z<D)}function X(){if(U!==null){var K=i.unstable_now();z=K;var re=!0;try{re=U(!0,K)}finally{re?j():(N=!1,U=null)}}else N=!1}var j;if(typeof P=="function")j=function(){P(X)};else if(typeof MessageChannel<"u"){var le=new MessageChannel,$=le.port2;le.port1.onmessage=X,j=function(){$.postMessage(null)}}else j=function(){M(X,0)};function ue(K){U=K,N||(N=!0,j())}function J(K,re){w=M(function(){K(i.unstable_now())},re)}i.unstable_IdlePriority=5,i.unstable_ImmediatePriority=1,i.unstable_LowPriority=4,i.unstable_NormalPriority=3,i.unstable_Profiling=null,i.unstable_UserBlockingPriority=2,i.unstable_cancelCallback=function(K){K.callback=null},i.unstable_continueExecution=function(){E||_||(E=!0,ue(I))},i.unstable_forceFrameRate=function(K){0>K||125<K?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):D=0<K?Math.floor(1e3/K):5},i.unstable_getCurrentPriorityLevel=function(){return v},i.unstable_getFirstCallbackNode=function(){return t(h)},i.unstable_next=function(K){switch(v){case 1:case 2:case 3:var re=3;break;default:re=v}var de=v;v=re;try{return K()}finally{v=de}},i.unstable_pauseExecution=function(){},i.unstable_requestPaint=function(){},i.unstable_runWithPriority=function(K,re){switch(K){case 1:case 2:case 3:case 4:case 5:break;default:K=3}var de=v;v=K;try{return re()}finally{v=de}},i.unstable_scheduleCallback=function(K,re,de){var F=i.unstable_now();switch(typeof de=="object"&&de!==null?(de=de.delay,de=typeof de=="number"&&0<de?F+de:F):de=F,K){case 1:var ee=-1;break;case 2:ee=250;break;case 5:ee=1073741823;break;case 4:ee=1e4;break;default:ee=5e3}return ee=de+ee,K={id:g++,callback:re,priorityLevel:K,startTime:de,expirationTime:ee,sortIndex:-1},de>F?(K.sortIndex=de,e(f,K),t(h)===null&&K===t(f)&&(b?(S(w),w=-1):b=!0,J(C,de-F))):(K.sortIndex=ee,e(h,K),E||_||(E=!0,ue(I))),K},i.unstable_shouldYield=H,i.unstable_wrapCallback=function(K){var re=v;return function(){var de=v;v=re;try{return K.apply(this,arguments)}finally{v=de}}}})(of)),of}var vx;function bM(){return vx||(vx=1,af.exports=wM()),af.exports}/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var _x;function TM(){if(_x)return oi;_x=1;var i=dm(),e=bM();function t(n){for(var s="https://reactjs.org/docs/error-decoder.html?invariant="+n,o=1;o<arguments.length;o++)s+="&args[]="+encodeURIComponent(arguments[o]);return"Minified React error #"+n+"; visit "+s+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var r=new Set,a={};function l(n,s){c(n,s),c(n+"Capture",s)}function c(n,s){for(a[n]=s,n=0;n<s.length;n++)r.add(s[n])}var d=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),h=Object.prototype.hasOwnProperty,f=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,g={},p={};function v(n){return h.call(p,n)?!0:h.call(g,n)?!1:f.test(n)?p[n]=!0:(g[n]=!0,!1)}function _(n,s,o,u){if(o!==null&&o.type===0)return!1;switch(typeof s){case"function":case"symbol":return!0;case"boolean":return u?!1:o!==null?!o.acceptsBooleans:(n=n.toLowerCase().slice(0,5),n!=="data-"&&n!=="aria-");default:return!1}}function E(n,s,o,u){if(s===null||typeof s>"u"||_(n,s,o,u))return!0;if(u)return!1;if(o!==null)switch(o.type){case 3:return!s;case 4:return s===!1;case 5:return isNaN(s);case 6:return isNaN(s)||1>s}return!1}function b(n,s,o,u,m,y,R){this.acceptsBooleans=s===2||s===3||s===4,this.attributeName=u,this.attributeNamespace=m,this.mustUseProperty=o,this.propertyName=n,this.type=s,this.sanitizeURL=y,this.removeEmptyString=R}var M={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(n){M[n]=new b(n,0,!1,n,null,!1,!1)}),[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(n){var s=n[0];M[s]=new b(s,1,!1,n[1],null,!1,!1)}),["contentEditable","draggable","spellCheck","value"].forEach(function(n){M[n]=new b(n,2,!1,n.toLowerCase(),null,!1,!1)}),["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(n){M[n]=new b(n,2,!1,n,null,!1,!1)}),"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(n){M[n]=new b(n,3,!1,n.toLowerCase(),null,!1,!1)}),["checked","multiple","muted","selected"].forEach(function(n){M[n]=new b(n,3,!0,n,null,!1,!1)}),["capture","download"].forEach(function(n){M[n]=new b(n,4,!1,n,null,!1,!1)}),["cols","rows","size","span"].forEach(function(n){M[n]=new b(n,6,!1,n,null,!1,!1)}),["rowSpan","start"].forEach(function(n){M[n]=new b(n,5,!1,n.toLowerCase(),null,!1,!1)});var S=/[\-:]([a-z])/g;function P(n){return n[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(n){var s=n.replace(S,P);M[s]=new b(s,1,!1,n,null,!1,!1)}),"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(n){var s=n.replace(S,P);M[s]=new b(s,1,!1,n,"http://www.w3.org/1999/xlink",!1,!1)}),["xml:base","xml:lang","xml:space"].forEach(function(n){var s=n.replace(S,P);M[s]=new b(s,1,!1,n,"http://www.w3.org/XML/1998/namespace",!1,!1)}),["tabIndex","crossOrigin"].forEach(function(n){M[n]=new b(n,1,!1,n.toLowerCase(),null,!1,!1)}),M.xlinkHref=new b("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1),["src","href","action","formAction"].forEach(function(n){M[n]=new b(n,1,!1,n.toLowerCase(),null,!0,!0)});function L(n,s,o,u){var m=M.hasOwnProperty(s)?M[s]:null;(m!==null?m.type!==0:u||!(2<s.length)||s[0]!=="o"&&s[0]!=="O"||s[1]!=="n"&&s[1]!=="N")&&(E(s,o,m,u)&&(o=null),u||m===null?v(s)&&(o===null?n.removeAttribute(s):n.setAttribute(s,""+o)):m.mustUseProperty?n[m.propertyName]=o===null?m.type===3?!1:"":o:(s=m.attributeName,u=m.attributeNamespace,o===null?n.removeAttribute(s):(m=m.type,o=m===3||m===4&&o===!0?"":""+o,u?n.setAttributeNS(u,s,o):n.setAttribute(s,o))))}var C=i.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,I=Symbol.for("react.element"),N=Symbol.for("react.portal"),U=Symbol.for("react.fragment"),w=Symbol.for("react.strict_mode"),D=Symbol.for("react.profiler"),z=Symbol.for("react.provider"),H=Symbol.for("react.context"),X=Symbol.for("react.forward_ref"),j=Symbol.for("react.suspense"),le=Symbol.for("react.suspense_list"),$=Symbol.for("react.memo"),ue=Symbol.for("react.lazy"),J=Symbol.for("react.offscreen"),K=Symbol.iterator;function re(n){return n===null||typeof n!="object"?null:(n=K&&n[K]||n["@@iterator"],typeof n=="function"?n:null)}var de=Object.assign,F;function ee(n){if(F===void 0)try{throw Error()}catch(o){var s=o.stack.trim().match(/\n( *(at )?)/);F=s&&s[1]||""}return`
`+F+n}var Ce=!1;function Ve(n,s){if(!n||Ce)return"";Ce=!0;var o=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(s)if(s=function(){throw Error()},Object.defineProperty(s.prototype,"props",{set:function(){throw Error()}}),typeof Reflect=="object"&&Reflect.construct){try{Reflect.construct(s,[])}catch(me){var u=me}Reflect.construct(n,[],s)}else{try{s.call()}catch(me){u=me}n.call(s.prototype)}else{try{throw Error()}catch(me){u=me}n()}}catch(me){if(me&&u&&typeof me.stack=="string"){for(var m=me.stack.split(`
`),y=u.stack.split(`
`),R=m.length-1,B=y.length-1;1<=R&&0<=B&&m[R]!==y[B];)B--;for(;1<=R&&0<=B;R--,B--)if(m[R]!==y[B]){if(R!==1||B!==1)do if(R--,B--,0>B||m[R]!==y[B]){var W=`
`+m[R].replace(" at new "," at ");return n.displayName&&W.includes("<anonymous>")&&(W=W.replace("<anonymous>",n.displayName)),W}while(1<=R&&0<=B);break}}}finally{Ce=!1,Error.prepareStackTrace=o}return(n=n?n.displayName||n.name:"")?ee(n):""}function Ge(n){switch(n.tag){case 5:return ee(n.type);case 16:return ee("Lazy");case 13:return ee("Suspense");case 19:return ee("SuspenseList");case 0:case 2:case 15:return n=Ve(n.type,!1),n;case 11:return n=Ve(n.type.render,!1),n;case 1:return n=Ve(n.type,!0),n;default:return""}}function V(n){if(n==null)return null;if(typeof n=="function")return n.displayName||n.name||null;if(typeof n=="string")return n;switch(n){case U:return"Fragment";case N:return"Portal";case D:return"Profiler";case w:return"StrictMode";case j:return"Suspense";case le:return"SuspenseList"}if(typeof n=="object")switch(n.$$typeof){case H:return(n.displayName||"Context")+".Consumer";case z:return(n._context.displayName||"Context")+".Provider";case X:var s=n.render;return n=n.displayName,n||(n=s.displayName||s.name||"",n=n!==""?"ForwardRef("+n+")":"ForwardRef"),n;case $:return s=n.displayName||null,s!==null?s:V(n.type)||"Memo";case ue:s=n._payload,n=n._init;try{return V(n(s))}catch{}}return null}function xe(n){var s=n.type;switch(n.tag){case 24:return"Cache";case 9:return(s.displayName||"Context")+".Consumer";case 10:return(s._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return n=s.render,n=n.displayName||n.name||"",s.displayName||(n!==""?"ForwardRef("+n+")":"ForwardRef");case 7:return"Fragment";case 5:return s;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return V(s);case 8:return s===w?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof s=="function")return s.displayName||s.name||null;if(typeof s=="string")return s}return null}function fe(n){switch(typeof n){case"boolean":case"number":case"string":case"undefined":return n;case"object":return n;default:return""}}function ne(n){var s=n.type;return(n=n.nodeName)&&n.toLowerCase()==="input"&&(s==="checkbox"||s==="radio")}function Le(n){var s=ne(n)?"checked":"value",o=Object.getOwnPropertyDescriptor(n.constructor.prototype,s),u=""+n[s];if(!n.hasOwnProperty(s)&&typeof o<"u"&&typeof o.get=="function"&&typeof o.set=="function"){var m=o.get,y=o.set;return Object.defineProperty(n,s,{configurable:!0,get:function(){return m.call(this)},set:function(R){u=""+R,y.call(this,R)}}),Object.defineProperty(n,s,{enumerable:o.enumerable}),{getValue:function(){return u},setValue:function(R){u=""+R},stopTracking:function(){n._valueTracker=null,delete n[s]}}}}function qe(n){n._valueTracker||(n._valueTracker=Le(n))}function Vt(n){if(!n)return!1;var s=n._valueTracker;if(!s)return!0;var o=s.getValue(),u="";return n&&(u=ne(n)?n.checked?"true":"false":n.value),n=u,n!==o?(s.setValue(n),!0):!1}function dt(n){if(n=n||(typeof document<"u"?document:void 0),typeof n>"u")return null;try{return n.activeElement||n.body}catch{return n.body}}function Dt(n,s){var o=s.checked;return de({},s,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:o??n._wrapperState.initialChecked})}function Ct(n,s){var o=s.defaultValue==null?"":s.defaultValue,u=s.checked!=null?s.checked:s.defaultChecked;o=fe(s.value!=null?s.value:o),n._wrapperState={initialChecked:u,initialValue:o,controlled:s.type==="checkbox"||s.type==="radio"?s.checked!=null:s.value!=null}}function Et(n,s){s=s.checked,s!=null&&L(n,"checked",s,!1)}function Zt(n,s){Et(n,s);var o=fe(s.value),u=s.type;if(o!=null)u==="number"?(o===0&&n.value===""||n.value!=o)&&(n.value=""+o):n.value!==""+o&&(n.value=""+o);else if(u==="submit"||u==="reset"){n.removeAttribute("value");return}s.hasOwnProperty("value")?dn(n,s.type,o):s.hasOwnProperty("defaultValue")&&dn(n,s.type,fe(s.defaultValue)),s.checked==null&&s.defaultChecked!=null&&(n.defaultChecked=!!s.defaultChecked)}function un(n,s,o){if(s.hasOwnProperty("value")||s.hasOwnProperty("defaultValue")){var u=s.type;if(!(u!=="submit"&&u!=="reset"||s.value!==void 0&&s.value!==null))return;s=""+n._wrapperState.initialValue,o||s===n.value||(n.value=s),n.defaultValue=s}o=n.name,o!==""&&(n.name=""),n.defaultChecked=!!n._wrapperState.initialChecked,o!==""&&(n.name=o)}function dn(n,s,o){(s!=="number"||dt(n.ownerDocument)!==n)&&(o==null?n.defaultValue=""+n._wrapperState.initialValue:n.defaultValue!==""+o&&(n.defaultValue=""+o))}var sn=Array.isArray;function Ot(n,s,o,u){if(n=n.options,s){s={};for(var m=0;m<o.length;m++)s["$"+o[m]]=!0;for(o=0;o<n.length;o++)m=s.hasOwnProperty("$"+n[o].value),n[o].selected!==m&&(n[o].selected=m),m&&u&&(n[o].defaultSelected=!0)}else{for(o=""+fe(o),s=null,m=0;m<n.length;m++){if(n[m].value===o){n[m].selected=!0,u&&(n[m].defaultSelected=!0);return}s!==null||n[m].disabled||(s=n[m])}s!==null&&(s.selected=!0)}}function Jt(n,s){if(s.dangerouslySetInnerHTML!=null)throw Error(t(91));return de({},s,{value:void 0,defaultValue:void 0,children:""+n._wrapperState.initialValue})}function Q(n,s){var o=s.value;if(o==null){if(o=s.children,s=s.defaultValue,o!=null){if(s!=null)throw Error(t(92));if(sn(o)){if(1<o.length)throw Error(t(93));o=o[0]}s=o}s==null&&(s=""),o=s}n._wrapperState={initialValue:fe(o)}}function Pn(n,s){var o=fe(s.value),u=fe(s.defaultValue);o!=null&&(o=""+o,o!==n.value&&(n.value=o),s.defaultValue==null&&n.defaultValue!==o&&(n.defaultValue=o)),u!=null&&(n.defaultValue=""+u)}function Nt(n){var s=n.textContent;s===n._wrapperState.initialValue&&s!==""&&s!==null&&(n.value=s)}function O(n){switch(n){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function T(n,s){return n==null||n==="http://www.w3.org/1999/xhtml"?O(s):n==="http://www.w3.org/2000/svg"&&s==="foreignObject"?"http://www.w3.org/1999/xhtml":n}var ie,he=(function(n){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(s,o,u,m){MSApp.execUnsafeLocalFunction(function(){return n(s,o,u,m)})}:n})(function(n,s){if(n.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in n)n.innerHTML=s;else{for(ie=ie||document.createElement("div"),ie.innerHTML="<svg>"+s.valueOf().toString()+"</svg>",s=ie.firstChild;n.firstChild;)n.removeChild(n.firstChild);for(;s.firstChild;)n.appendChild(s.firstChild)}});function ge(n,s){if(s){var o=n.firstChild;if(o&&o===n.lastChild&&o.nodeType===3){o.nodeValue=s;return}}n.textContent=s}var be={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},De=["Webkit","ms","Moz","O"];Object.keys(be).forEach(function(n){De.forEach(function(s){s=s+n.charAt(0).toUpperCase()+n.substring(1),be[s]=be[n]})});function ve(n,s,o){return s==null||typeof s=="boolean"||s===""?"":o||typeof s!="number"||s===0||be.hasOwnProperty(n)&&be[n]?(""+s).trim():s+"px"}function ye(n,s){n=n.style;for(var o in s)if(s.hasOwnProperty(o)){var u=o.indexOf("--")===0,m=ve(o,s[o],u);o==="float"&&(o="cssFloat"),u?n.setProperty(o,m):n[o]=m}}var Ue=de({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Ze(n,s){if(s){if(Ue[n]&&(s.children!=null||s.dangerouslySetInnerHTML!=null))throw Error(t(137,n));if(s.dangerouslySetInnerHTML!=null){if(s.children!=null)throw Error(t(60));if(typeof s.dangerouslySetInnerHTML!="object"||!("__html"in s.dangerouslySetInnerHTML))throw Error(t(61))}if(s.style!=null&&typeof s.style!="object")throw Error(t(62))}}function Fe(n,s){if(n.indexOf("-")===-1)return typeof s.is=="string";switch(n){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Ne=null;function nt(n){return n=n.target||n.srcElement||window,n.correspondingUseElement&&(n=n.correspondingUseElement),n.nodeType===3?n.parentNode:n}var rt=null,lt=null,q=null;function Pe(n){if(n=ul(n)){if(typeof rt!="function")throw Error(t(280));var s=n.stateNode;s&&(s=wc(s),rt(n.stateNode,n.type,s))}}function _e(n){lt?q?q.push(n):q=[n]:lt=n}function Ie(){if(lt){var n=lt,s=q;if(q=lt=null,Pe(n),s)for(n=0;n<s.length;n++)Pe(s[n])}}function Oe(n,s){return n(s)}function Se(){}var Ke=!1;function Xe(n,s,o){if(Ke)return n(s,o);Ke=!0;try{return Oe(n,s,o)}finally{Ke=!1,(lt!==null||q!==null)&&(Se(),Ie())}}function Gt(n,s){var o=n.stateNode;if(o===null)return null;var u=wc(o);if(u===null)return null;o=u[s];e:switch(s){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(u=!u.disabled)||(n=n.type,u=!(n==="button"||n==="input"||n==="select"||n==="textarea")),n=!u;break e;default:n=!1}if(n)return null;if(o&&typeof o!="function")throw Error(t(231,s,typeof o));return o}var It=!1;if(d)try{var Fn={};Object.defineProperty(Fn,"passive",{get:function(){It=!0}}),window.addEventListener("test",Fn,Fn),window.removeEventListener("test",Fn,Fn)}catch{It=!1}function wi(n,s,o,u,m,y,R,B,W){var me=Array.prototype.slice.call(arguments,3);try{s.apply(o,me)}catch(Ee){this.onError(Ee)}}var Bs=!1,Ta=null,Hs=!1,Vs=null,wd={onError:function(n){Bs=!0,Ta=n}};function ac(n,s,o,u,m,y,R,B,W){Bs=!1,Ta=null,wi.apply(wd,arguments)}function oc(n,s,o,u,m,y,R,B,W){if(ac.apply(this,arguments),Bs){if(Bs){var me=Ta;Bs=!1,Ta=null}else throw Error(t(198));Hs||(Hs=!0,Vs=me)}}function Xn(n){var s=n,o=n;if(n.alternate)for(;s.return;)s=s.return;else{n=s;do s=n,(s.flags&4098)!==0&&(o=s.return),n=s.return;while(n)}return s.tag===3?o:null}function Ca(n){if(n.tag===13){var s=n.memoizedState;if(s===null&&(n=n.alternate,n!==null&&(s=n.memoizedState)),s!==null)return s.dehydrated}return null}function jo(n){if(Xn(n)!==n)throw Error(t(188))}function lc(n){var s=n.alternate;if(!s){if(s=Xn(n),s===null)throw Error(t(188));return s!==n?null:n}for(var o=n,u=s;;){var m=o.return;if(m===null)break;var y=m.alternate;if(y===null){if(u=m.return,u!==null){o=u;continue}break}if(m.child===y.child){for(y=m.child;y;){if(y===o)return jo(m),n;if(y===u)return jo(m),s;y=y.sibling}throw Error(t(188))}if(o.return!==u.return)o=m,u=y;else{for(var R=!1,B=m.child;B;){if(B===o){R=!0,o=m,u=y;break}if(B===u){R=!0,u=m,o=y;break}B=B.sibling}if(!R){for(B=y.child;B;){if(B===o){R=!0,o=y,u=m;break}if(B===u){R=!0,u=y,o=m;break}B=B.sibling}if(!R)throw Error(t(189))}}if(o.alternate!==u)throw Error(t(190))}if(o.tag!==3)throw Error(t(188));return o.stateNode.current===o?n:s}function Gs(n){return n=lc(n),n!==null?Wo(n):null}function Wo(n){if(n.tag===5||n.tag===6)return n;for(n=n.child;n!==null;){var s=Wo(n);if(s!==null)return s;n=n.sibling}return null}var js=e.unstable_scheduleCallback,Xo=e.unstable_cancelCallback,cc=e.unstable_shouldYield,bd=e.unstable_requestPaint,an=e.unstable_now,Td=e.unstable_getCurrentPriorityLevel,$o=e.unstable_ImmediatePriority,A=e.unstable_UserBlockingPriority,Z=e.unstable_NormalPriority,pe=e.unstable_LowPriority,oe=e.unstable_IdlePriority,ae=null,Ae=null;function je(n){if(Ae&&typeof Ae.onCommitFiberRoot=="function")try{Ae.onCommitFiberRoot(ae,n,void 0,(n.current.flags&128)===128)}catch{}}var Re=Math.clz32?Math.clz32:ht,Ye=Math.log,tt=Math.LN2;function ht(n){return n>>>=0,n===0?32:31-(Ye(n)/tt|0)|0}var ft=64,Je=4194304;function Rt(n){switch(n&-n){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return n&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return n}}function Xt(n,s){var o=n.pendingLanes;if(o===0)return 0;var u=0,m=n.suspendedLanes,y=n.pingedLanes,R=o&268435455;if(R!==0){var B=R&~m;B!==0?u=Rt(B):(y&=R,y!==0&&(u=Rt(y)))}else R=o&~m,R!==0?u=Rt(R):y!==0&&(u=Rt(y));if(u===0)return 0;if(s!==0&&s!==u&&(s&m)===0&&(m=u&-u,y=s&-s,m>=y||m===16&&(y&4194240)!==0))return s;if((u&4)!==0&&(u|=o&16),s=n.entangledLanes,s!==0)for(n=n.entanglements,s&=u;0<s;)o=31-Re(s),m=1<<o,u|=n[o],s&=~m;return u}function en(n,s){switch(n){case 1:case 2:case 4:return s+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return s+5e3;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function kt(n,s){for(var o=n.suspendedLanes,u=n.pingedLanes,m=n.expirationTimes,y=n.pendingLanes;0<y;){var R=31-Re(y),B=1<<R,W=m[R];W===-1?((B&o)===0||(B&u)!==0)&&(m[R]=en(B,s)):W<=s&&(n.expiredLanes|=B),y&=~B}}function mn(n){return n=n.pendingLanes&-1073741825,n!==0?n:n&1073741824?1073741824:0}function Be(){var n=ft;return ft<<=1,(ft&4194240)===0&&(ft=64),n}function Nn(n){for(var s=[],o=0;31>o;o++)s.push(n);return s}function vt(n,s,o){n.pendingLanes|=s,s!==536870912&&(n.suspendedLanes=0,n.pingedLanes=0),n=n.eventTimes,s=31-Re(s),n[s]=o}function ei(n,s){var o=n.pendingLanes&~s;n.pendingLanes=s,n.suspendedLanes=0,n.pingedLanes=0,n.expiredLanes&=s,n.mutableReadLanes&=s,n.entangledLanes&=s,s=n.entanglements;var u=n.eventTimes;for(n=n.expirationTimes;0<o;){var m=31-Re(o),y=1<<m;s[m]=0,u[m]=-1,n[m]=-1,o&=~y}}function ti(n,s){var o=n.entangledLanes|=s;for(n=n.entanglements;o;){var u=31-Re(o),m=1<<u;m&s|n[u]&s&&(n[u]|=s),o&=~m}}var yt=0;function Er(n){return n&=-n,1<n?4<n?(n&268435455)!==0?16:536870912:4:1}var Ut,Kt,Fi,zt,Oi,er=!1,Ws=[],Zr=null,Jr=null,es=null,qo=new Map,Ko=new Map,ts=[],Hy="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Km(n,s){switch(n){case"focusin":case"focusout":Zr=null;break;case"dragenter":case"dragleave":Jr=null;break;case"mouseover":case"mouseout":es=null;break;case"pointerover":case"pointerout":qo.delete(s.pointerId);break;case"gotpointercapture":case"lostpointercapture":Ko.delete(s.pointerId)}}function Yo(n,s,o,u,m,y){return n===null||n.nativeEvent!==y?(n={blockedOn:s,domEventName:o,eventSystemFlags:u,nativeEvent:y,targetContainers:[m]},s!==null&&(s=ul(s),s!==null&&Kt(s)),n):(n.eventSystemFlags|=u,s=n.targetContainers,m!==null&&s.indexOf(m)===-1&&s.push(m),n)}function Vy(n,s,o,u,m){switch(s){case"focusin":return Zr=Yo(Zr,n,s,o,u,m),!0;case"dragenter":return Jr=Yo(Jr,n,s,o,u,m),!0;case"mouseover":return es=Yo(es,n,s,o,u,m),!0;case"pointerover":var y=m.pointerId;return qo.set(y,Yo(qo.get(y)||null,n,s,o,u,m)),!0;case"gotpointercapture":return y=m.pointerId,Ko.set(y,Yo(Ko.get(y)||null,n,s,o,u,m)),!0}return!1}function Ym(n){var s=Xs(n.target);if(s!==null){var o=Xn(s);if(o!==null){if(s=o.tag,s===13){if(s=Ca(o),s!==null){n.blockedOn=s,Oi(n.priority,function(){Fi(o)});return}}else if(s===3&&o.stateNode.current.memoizedState.isDehydrated){n.blockedOn=o.tag===3?o.stateNode.containerInfo:null;return}}}n.blockedOn=null}function uc(n){if(n.blockedOn!==null)return!1;for(var s=n.targetContainers;0<s.length;){var o=Rd(n.domEventName,n.eventSystemFlags,s[0],n.nativeEvent);if(o===null){o=n.nativeEvent;var u=new o.constructor(o.type,o);Ne=u,o.target.dispatchEvent(u),Ne=null}else return s=ul(o),s!==null&&Kt(s),n.blockedOn=o,!1;s.shift()}return!0}function Qm(n,s,o){uc(n)&&o.delete(s)}function Gy(){er=!1,Zr!==null&&uc(Zr)&&(Zr=null),Jr!==null&&uc(Jr)&&(Jr=null),es!==null&&uc(es)&&(es=null),qo.forEach(Qm),Ko.forEach(Qm)}function Qo(n,s){n.blockedOn===s&&(n.blockedOn=null,er||(er=!0,e.unstable_scheduleCallback(e.unstable_NormalPriority,Gy)))}function Zo(n){function s(m){return Qo(m,n)}if(0<Ws.length){Qo(Ws[0],n);for(var o=1;o<Ws.length;o++){var u=Ws[o];u.blockedOn===n&&(u.blockedOn=null)}}for(Zr!==null&&Qo(Zr,n),Jr!==null&&Qo(Jr,n),es!==null&&Qo(es,n),qo.forEach(s),Ko.forEach(s),o=0;o<ts.length;o++)u=ts[o],u.blockedOn===n&&(u.blockedOn=null);for(;0<ts.length&&(o=ts[0],o.blockedOn===null);)Ym(o),o.blockedOn===null&&ts.shift()}var Ra=C.ReactCurrentBatchConfig,dc=!0;function jy(n,s,o,u){var m=yt,y=Ra.transition;Ra.transition=null;try{yt=1,Cd(n,s,o,u)}finally{yt=m,Ra.transition=y}}function Wy(n,s,o,u){var m=yt,y=Ra.transition;Ra.transition=null;try{yt=4,Cd(n,s,o,u)}finally{yt=m,Ra.transition=y}}function Cd(n,s,o,u){if(dc){var m=Rd(n,s,o,u);if(m===null)Wd(n,s,u,hc,o),Km(n,u);else if(Vy(m,n,s,o,u))u.stopPropagation();else if(Km(n,u),s&4&&-1<Hy.indexOf(n)){for(;m!==null;){var y=ul(m);if(y!==null&&Ut(y),y=Rd(n,s,o,u),y===null&&Wd(n,s,u,hc,o),y===m)break;m=y}m!==null&&u.stopPropagation()}else Wd(n,s,u,null,o)}}var hc=null;function Rd(n,s,o,u){if(hc=null,n=nt(u),n=Xs(n),n!==null)if(s=Xn(n),s===null)n=null;else if(o=s.tag,o===13){if(n=Ca(s),n!==null)return n;n=null}else if(o===3){if(s.stateNode.current.memoizedState.isDehydrated)return s.tag===3?s.stateNode.containerInfo:null;n=null}else s!==n&&(n=null);return hc=n,null}function Zm(n){switch(n){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(Td()){case $o:return 1;case A:return 4;case Z:case pe:return 16;case oe:return 536870912;default:return 16}default:return 16}}var ns=null,Ad=null,fc=null;function Jm(){if(fc)return fc;var n,s=Ad,o=s.length,u,m="value"in ns?ns.value:ns.textContent,y=m.length;for(n=0;n<o&&s[n]===m[n];n++);var R=o-n;for(u=1;u<=R&&s[o-u]===m[y-u];u++);return fc=m.slice(n,1<u?1-u:void 0)}function pc(n){var s=n.keyCode;return"charCode"in n?(n=n.charCode,n===0&&s===13&&(n=13)):n=s,n===10&&(n=13),32<=n||n===13?n:0}function mc(){return!0}function eg(){return!1}function fi(n){function s(o,u,m,y,R){this._reactName=o,this._targetInst=m,this.type=u,this.nativeEvent=y,this.target=R,this.currentTarget=null;for(var B in n)n.hasOwnProperty(B)&&(o=n[B],this[B]=o?o(y):y[B]);return this.isDefaultPrevented=(y.defaultPrevented!=null?y.defaultPrevented:y.returnValue===!1)?mc:eg,this.isPropagationStopped=eg,this}return de(s.prototype,{preventDefault:function(){this.defaultPrevented=!0;var o=this.nativeEvent;o&&(o.preventDefault?o.preventDefault():typeof o.returnValue!="unknown"&&(o.returnValue=!1),this.isDefaultPrevented=mc)},stopPropagation:function(){var o=this.nativeEvent;o&&(o.stopPropagation?o.stopPropagation():typeof o.cancelBubble!="unknown"&&(o.cancelBubble=!0),this.isPropagationStopped=mc)},persist:function(){},isPersistent:mc}),s}var Aa={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(n){return n.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Pd=fi(Aa),Jo=de({},Aa,{view:0,detail:0}),Xy=fi(Jo),Nd,Ld,el,gc=de({},Jo,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Id,button:0,buttons:0,relatedTarget:function(n){return n.relatedTarget===void 0?n.fromElement===n.srcElement?n.toElement:n.fromElement:n.relatedTarget},movementX:function(n){return"movementX"in n?n.movementX:(n!==el&&(el&&n.type==="mousemove"?(Nd=n.screenX-el.screenX,Ld=n.screenY-el.screenY):Ld=Nd=0,el=n),Nd)},movementY:function(n){return"movementY"in n?n.movementY:Ld}}),tg=fi(gc),$y=de({},gc,{dataTransfer:0}),qy=fi($y),Ky=de({},Jo,{relatedTarget:0}),Dd=fi(Ky),Yy=de({},Aa,{animationName:0,elapsedTime:0,pseudoElement:0}),Qy=fi(Yy),Zy=de({},Aa,{clipboardData:function(n){return"clipboardData"in n?n.clipboardData:window.clipboardData}}),Jy=fi(Zy),eS=de({},Aa,{data:0}),ng=fi(eS),tS={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},nS={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},iS={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function rS(n){var s=this.nativeEvent;return s.getModifierState?s.getModifierState(n):(n=iS[n])?!!s[n]:!1}function Id(){return rS}var sS=de({},Jo,{key:function(n){if(n.key){var s=tS[n.key]||n.key;if(s!=="Unidentified")return s}return n.type==="keypress"?(n=pc(n),n===13?"Enter":String.fromCharCode(n)):n.type==="keydown"||n.type==="keyup"?nS[n.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Id,charCode:function(n){return n.type==="keypress"?pc(n):0},keyCode:function(n){return n.type==="keydown"||n.type==="keyup"?n.keyCode:0},which:function(n){return n.type==="keypress"?pc(n):n.type==="keydown"||n.type==="keyup"?n.keyCode:0}}),aS=fi(sS),oS=de({},gc,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),ig=fi(oS),lS=de({},Jo,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Id}),cS=fi(lS),uS=de({},Aa,{propertyName:0,elapsedTime:0,pseudoElement:0}),dS=fi(uS),hS=de({},gc,{deltaX:function(n){return"deltaX"in n?n.deltaX:"wheelDeltaX"in n?-n.wheelDeltaX:0},deltaY:function(n){return"deltaY"in n?n.deltaY:"wheelDeltaY"in n?-n.wheelDeltaY:"wheelDelta"in n?-n.wheelDelta:0},deltaZ:0,deltaMode:0}),fS=fi(hS),pS=[9,13,27,32],Ud=d&&"CompositionEvent"in window,tl=null;d&&"documentMode"in document&&(tl=document.documentMode);var mS=d&&"TextEvent"in window&&!tl,rg=d&&(!Ud||tl&&8<tl&&11>=tl),sg=" ",ag=!1;function og(n,s){switch(n){case"keyup":return pS.indexOf(s.keyCode)!==-1;case"keydown":return s.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function lg(n){return n=n.detail,typeof n=="object"&&"data"in n?n.data:null}var Pa=!1;function gS(n,s){switch(n){case"compositionend":return lg(s);case"keypress":return s.which!==32?null:(ag=!0,sg);case"textInput":return n=s.data,n===sg&&ag?null:n;default:return null}}function xS(n,s){if(Pa)return n==="compositionend"||!Ud&&og(n,s)?(n=Jm(),fc=Ad=ns=null,Pa=!1,n):null;switch(n){case"paste":return null;case"keypress":if(!(s.ctrlKey||s.altKey||s.metaKey)||s.ctrlKey&&s.altKey){if(s.char&&1<s.char.length)return s.char;if(s.which)return String.fromCharCode(s.which)}return null;case"compositionend":return rg&&s.locale!=="ko"?null:s.data;default:return null}}var vS={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function cg(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s==="input"?!!vS[n.type]:s==="textarea"}function ug(n,s,o,u){_e(u),s=Sc(s,"onChange"),0<s.length&&(o=new Pd("onChange","change",null,o,u),n.push({event:o,listeners:s}))}var nl=null,il=null;function _S(n){Rg(n,0)}function xc(n){var s=Ua(n);if(Vt(s))return n}function yS(n,s){if(n==="change")return s}var dg=!1;if(d){var Fd;if(d){var Od="oninput"in document;if(!Od){var hg=document.createElement("div");hg.setAttribute("oninput","return;"),Od=typeof hg.oninput=="function"}Fd=Od}else Fd=!1;dg=Fd&&(!document.documentMode||9<document.documentMode)}function fg(){nl&&(nl.detachEvent("onpropertychange",pg),il=nl=null)}function pg(n){if(n.propertyName==="value"&&xc(il)){var s=[];ug(s,il,n,nt(n)),Xe(_S,s)}}function SS(n,s,o){n==="focusin"?(fg(),nl=s,il=o,nl.attachEvent("onpropertychange",pg)):n==="focusout"&&fg()}function MS(n){if(n==="selectionchange"||n==="keyup"||n==="keydown")return xc(il)}function ES(n,s){if(n==="click")return xc(s)}function wS(n,s){if(n==="input"||n==="change")return xc(s)}function bS(n,s){return n===s&&(n!==0||1/n===1/s)||n!==n&&s!==s}var ki=typeof Object.is=="function"?Object.is:bS;function rl(n,s){if(ki(n,s))return!0;if(typeof n!="object"||n===null||typeof s!="object"||s===null)return!1;var o=Object.keys(n),u=Object.keys(s);if(o.length!==u.length)return!1;for(u=0;u<o.length;u++){var m=o[u];if(!h.call(s,m)||!ki(n[m],s[m]))return!1}return!0}function mg(n){for(;n&&n.firstChild;)n=n.firstChild;return n}function gg(n,s){var o=mg(n);n=0;for(var u;o;){if(o.nodeType===3){if(u=n+o.textContent.length,n<=s&&u>=s)return{node:o,offset:s-n};n=u}e:{for(;o;){if(o.nextSibling){o=o.nextSibling;break e}o=o.parentNode}o=void 0}o=mg(o)}}function xg(n,s){return n&&s?n===s?!0:n&&n.nodeType===3?!1:s&&s.nodeType===3?xg(n,s.parentNode):"contains"in n?n.contains(s):n.compareDocumentPosition?!!(n.compareDocumentPosition(s)&16):!1:!1}function vg(){for(var n=window,s=dt();s instanceof n.HTMLIFrameElement;){try{var o=typeof s.contentWindow.location.href=="string"}catch{o=!1}if(o)n=s.contentWindow;else break;s=dt(n.document)}return s}function kd(n){var s=n&&n.nodeName&&n.nodeName.toLowerCase();return s&&(s==="input"&&(n.type==="text"||n.type==="search"||n.type==="tel"||n.type==="url"||n.type==="password")||s==="textarea"||n.contentEditable==="true")}function TS(n){var s=vg(),o=n.focusedElem,u=n.selectionRange;if(s!==o&&o&&o.ownerDocument&&xg(o.ownerDocument.documentElement,o)){if(u!==null&&kd(o)){if(s=u.start,n=u.end,n===void 0&&(n=s),"selectionStart"in o)o.selectionStart=s,o.selectionEnd=Math.min(n,o.value.length);else if(n=(s=o.ownerDocument||document)&&s.defaultView||window,n.getSelection){n=n.getSelection();var m=o.textContent.length,y=Math.min(u.start,m);u=u.end===void 0?y:Math.min(u.end,m),!n.extend&&y>u&&(m=u,u=y,y=m),m=gg(o,y);var R=gg(o,u);m&&R&&(n.rangeCount!==1||n.anchorNode!==m.node||n.anchorOffset!==m.offset||n.focusNode!==R.node||n.focusOffset!==R.offset)&&(s=s.createRange(),s.setStart(m.node,m.offset),n.removeAllRanges(),y>u?(n.addRange(s),n.extend(R.node,R.offset)):(s.setEnd(R.node,R.offset),n.addRange(s)))}}for(s=[],n=o;n=n.parentNode;)n.nodeType===1&&s.push({element:n,left:n.scrollLeft,top:n.scrollTop});for(typeof o.focus=="function"&&o.focus(),o=0;o<s.length;o++)n=s[o],n.element.scrollLeft=n.left,n.element.scrollTop=n.top}}var CS=d&&"documentMode"in document&&11>=document.documentMode,Na=null,zd=null,sl=null,Bd=!1;function _g(n,s,o){var u=o.window===o?o.document:o.nodeType===9?o:o.ownerDocument;Bd||Na==null||Na!==dt(u)||(u=Na,"selectionStart"in u&&kd(u)?u={start:u.selectionStart,end:u.selectionEnd}:(u=(u.ownerDocument&&u.ownerDocument.defaultView||window).getSelection(),u={anchorNode:u.anchorNode,anchorOffset:u.anchorOffset,focusNode:u.focusNode,focusOffset:u.focusOffset}),sl&&rl(sl,u)||(sl=u,u=Sc(zd,"onSelect"),0<u.length&&(s=new Pd("onSelect","select",null,s,o),n.push({event:s,listeners:u}),s.target=Na)))}function vc(n,s){var o={};return o[n.toLowerCase()]=s.toLowerCase(),o["Webkit"+n]="webkit"+s,o["Moz"+n]="moz"+s,o}var La={animationend:vc("Animation","AnimationEnd"),animationiteration:vc("Animation","AnimationIteration"),animationstart:vc("Animation","AnimationStart"),transitionend:vc("Transition","TransitionEnd")},Hd={},yg={};d&&(yg=document.createElement("div").style,"AnimationEvent"in window||(delete La.animationend.animation,delete La.animationiteration.animation,delete La.animationstart.animation),"TransitionEvent"in window||delete La.transitionend.transition);function _c(n){if(Hd[n])return Hd[n];if(!La[n])return n;var s=La[n],o;for(o in s)if(s.hasOwnProperty(o)&&o in yg)return Hd[n]=s[o];return n}var Sg=_c("animationend"),Mg=_c("animationiteration"),Eg=_c("animationstart"),wg=_c("transitionend"),bg=new Map,Tg="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function is(n,s){bg.set(n,s),l(s,[n])}for(var Vd=0;Vd<Tg.length;Vd++){var Gd=Tg[Vd],RS=Gd.toLowerCase(),AS=Gd[0].toUpperCase()+Gd.slice(1);is(RS,"on"+AS)}is(Sg,"onAnimationEnd"),is(Mg,"onAnimationIteration"),is(Eg,"onAnimationStart"),is("dblclick","onDoubleClick"),is("focusin","onFocus"),is("focusout","onBlur"),is(wg,"onTransitionEnd"),c("onMouseEnter",["mouseout","mouseover"]),c("onMouseLeave",["mouseout","mouseover"]),c("onPointerEnter",["pointerout","pointerover"]),c("onPointerLeave",["pointerout","pointerover"]),l("onChange","change click focusin focusout input keydown keyup selectionchange".split(" ")),l("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" ")),l("onBeforeInput",["compositionend","keypress","textInput","paste"]),l("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" ")),l("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var al="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),PS=new Set("cancel close invalid load scroll toggle".split(" ").concat(al));function Cg(n,s,o){var u=n.type||"unknown-event";n.currentTarget=o,oc(u,s,void 0,n),n.currentTarget=null}function Rg(n,s){s=(s&4)!==0;for(var o=0;o<n.length;o++){var u=n[o],m=u.event;u=u.listeners;e:{var y=void 0;if(s)for(var R=u.length-1;0<=R;R--){var B=u[R],W=B.instance,me=B.currentTarget;if(B=B.listener,W!==y&&m.isPropagationStopped())break e;Cg(m,B,me),y=W}else for(R=0;R<u.length;R++){if(B=u[R],W=B.instance,me=B.currentTarget,B=B.listener,W!==y&&m.isPropagationStopped())break e;Cg(m,B,me),y=W}}}if(Hs)throw n=Vs,Hs=!1,Vs=null,n}function Yt(n,s){var o=s[Qd];o===void 0&&(o=s[Qd]=new Set);var u=n+"__bubble";o.has(u)||(Ag(s,n,2,!1),o.add(u))}function jd(n,s,o){var u=0;s&&(u|=4),Ag(o,n,u,s)}var yc="_reactListening"+Math.random().toString(36).slice(2);function ol(n){if(!n[yc]){n[yc]=!0,r.forEach(function(o){o!=="selectionchange"&&(PS.has(o)||jd(o,!1,n),jd(o,!0,n))});var s=n.nodeType===9?n:n.ownerDocument;s===null||s[yc]||(s[yc]=!0,jd("selectionchange",!1,s))}}function Ag(n,s,o,u){switch(Zm(s)){case 1:var m=jy;break;case 4:m=Wy;break;default:m=Cd}o=m.bind(null,s,o,n),m=void 0,!It||s!=="touchstart"&&s!=="touchmove"&&s!=="wheel"||(m=!0),u?m!==void 0?n.addEventListener(s,o,{capture:!0,passive:m}):n.addEventListener(s,o,!0):m!==void 0?n.addEventListener(s,o,{passive:m}):n.addEventListener(s,o,!1)}function Wd(n,s,o,u,m){var y=u;if((s&1)===0&&(s&2)===0&&u!==null)e:for(;;){if(u===null)return;var R=u.tag;if(R===3||R===4){var B=u.stateNode.containerInfo;if(B===m||B.nodeType===8&&B.parentNode===m)break;if(R===4)for(R=u.return;R!==null;){var W=R.tag;if((W===3||W===4)&&(W=R.stateNode.containerInfo,W===m||W.nodeType===8&&W.parentNode===m))return;R=R.return}for(;B!==null;){if(R=Xs(B),R===null)return;if(W=R.tag,W===5||W===6){u=y=R;continue e}B=B.parentNode}}u=u.return}Xe(function(){var me=y,Ee=nt(o),we=[];e:{var Me=bg.get(n);if(Me!==void 0){var He=Pd,$e=n;switch(n){case"keypress":if(pc(o)===0)break e;case"keydown":case"keyup":He=aS;break;case"focusin":$e="focus",He=Dd;break;case"focusout":$e="blur",He=Dd;break;case"beforeblur":case"afterblur":He=Dd;break;case"click":if(o.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":He=tg;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":He=qy;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":He=cS;break;case Sg:case Mg:case Eg:He=Qy;break;case wg:He=dS;break;case"scroll":He=Xy;break;case"wheel":He=fS;break;case"copy":case"cut":case"paste":He=Jy;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":He=ig}var Qe=(s&4)!==0,pn=!Qe&&n==="scroll",se=Qe?Me!==null?Me+"Capture":null:Me;Qe=[];for(var Y=me,ce;Y!==null;){ce=Y;var Te=ce.stateNode;if(ce.tag===5&&Te!==null&&(ce=Te,se!==null&&(Te=Gt(Y,se),Te!=null&&Qe.push(ll(Y,Te,ce)))),pn)break;Y=Y.return}0<Qe.length&&(Me=new He(Me,$e,null,o,Ee),we.push({event:Me,listeners:Qe}))}}if((s&7)===0){e:{if(Me=n==="mouseover"||n==="pointerover",He=n==="mouseout"||n==="pointerout",Me&&o!==Ne&&($e=o.relatedTarget||o.fromElement)&&(Xs($e)||$e[wr]))break e;if((He||Me)&&(Me=Ee.window===Ee?Ee:(Me=Ee.ownerDocument)?Me.defaultView||Me.parentWindow:window,He?($e=o.relatedTarget||o.toElement,He=me,$e=$e?Xs($e):null,$e!==null&&(pn=Xn($e),$e!==pn||$e.tag!==5&&$e.tag!==6)&&($e=null)):(He=null,$e=me),He!==$e)){if(Qe=tg,Te="onMouseLeave",se="onMouseEnter",Y="mouse",(n==="pointerout"||n==="pointerover")&&(Qe=ig,Te="onPointerLeave",se="onPointerEnter",Y="pointer"),pn=He==null?Me:Ua(He),ce=$e==null?Me:Ua($e),Me=new Qe(Te,Y+"leave",He,o,Ee),Me.target=pn,Me.relatedTarget=ce,Te=null,Xs(Ee)===me&&(Qe=new Qe(se,Y+"enter",$e,o,Ee),Qe.target=ce,Qe.relatedTarget=pn,Te=Qe),pn=Te,He&&$e)t:{for(Qe=He,se=$e,Y=0,ce=Qe;ce;ce=Da(ce))Y++;for(ce=0,Te=se;Te;Te=Da(Te))ce++;for(;0<Y-ce;)Qe=Da(Qe),Y--;for(;0<ce-Y;)se=Da(se),ce--;for(;Y--;){if(Qe===se||se!==null&&Qe===se.alternate)break t;Qe=Da(Qe),se=Da(se)}Qe=null}else Qe=null;He!==null&&Pg(we,Me,He,Qe,!1),$e!==null&&pn!==null&&Pg(we,pn,$e,Qe,!0)}}e:{if(Me=me?Ua(me):window,He=Me.nodeName&&Me.nodeName.toLowerCase(),He==="select"||He==="input"&&Me.type==="file")var et=yS;else if(cg(Me))if(dg)et=wS;else{et=MS;var st=SS}else(He=Me.nodeName)&&He.toLowerCase()==="input"&&(Me.type==="checkbox"||Me.type==="radio")&&(et=ES);if(et&&(et=et(n,me))){ug(we,et,o,Ee);break e}st&&st(n,Me,me),n==="focusout"&&(st=Me._wrapperState)&&st.controlled&&Me.type==="number"&&dn(Me,"number",Me.value)}switch(st=me?Ua(me):window,n){case"focusin":(cg(st)||st.contentEditable==="true")&&(Na=st,zd=me,sl=null);break;case"focusout":sl=zd=Na=null;break;case"mousedown":Bd=!0;break;case"contextmenu":case"mouseup":case"dragend":Bd=!1,_g(we,o,Ee);break;case"selectionchange":if(CS)break;case"keydown":case"keyup":_g(we,o,Ee)}var at;if(Ud)e:{switch(n){case"compositionstart":var ct="onCompositionStart";break e;case"compositionend":ct="onCompositionEnd";break e;case"compositionupdate":ct="onCompositionUpdate";break e}ct=void 0}else Pa?og(n,o)&&(ct="onCompositionEnd"):n==="keydown"&&o.keyCode===229&&(ct="onCompositionStart");ct&&(rg&&o.locale!=="ko"&&(Pa||ct!=="onCompositionStart"?ct==="onCompositionEnd"&&Pa&&(at=Jm()):(ns=Ee,Ad="value"in ns?ns.value:ns.textContent,Pa=!0)),st=Sc(me,ct),0<st.length&&(ct=new ng(ct,n,null,o,Ee),we.push({event:ct,listeners:st}),at?ct.data=at:(at=lg(o),at!==null&&(ct.data=at)))),(at=mS?gS(n,o):xS(n,o))&&(me=Sc(me,"onBeforeInput"),0<me.length&&(Ee=new ng("onBeforeInput","beforeinput",null,o,Ee),we.push({event:Ee,listeners:me}),Ee.data=at))}Rg(we,s)})}function ll(n,s,o){return{instance:n,listener:s,currentTarget:o}}function Sc(n,s){for(var o=s+"Capture",u=[];n!==null;){var m=n,y=m.stateNode;m.tag===5&&y!==null&&(m=y,y=Gt(n,o),y!=null&&u.unshift(ll(n,y,m)),y=Gt(n,s),y!=null&&u.push(ll(n,y,m))),n=n.return}return u}function Da(n){if(n===null)return null;do n=n.return;while(n&&n.tag!==5);return n||null}function Pg(n,s,o,u,m){for(var y=s._reactName,R=[];o!==null&&o!==u;){var B=o,W=B.alternate,me=B.stateNode;if(W!==null&&W===u)break;B.tag===5&&me!==null&&(B=me,m?(W=Gt(o,y),W!=null&&R.unshift(ll(o,W,B))):m||(W=Gt(o,y),W!=null&&R.push(ll(o,W,B)))),o=o.return}R.length!==0&&n.push({event:s,listeners:R})}var NS=/\r\n?/g,LS=/\u0000|\uFFFD/g;function Ng(n){return(typeof n=="string"?n:""+n).replace(NS,`
`).replace(LS,"")}function Mc(n,s,o){if(s=Ng(s),Ng(n)!==s&&o)throw Error(t(425))}function Ec(){}var Xd=null,$d=null;function qd(n,s){return n==="textarea"||n==="noscript"||typeof s.children=="string"||typeof s.children=="number"||typeof s.dangerouslySetInnerHTML=="object"&&s.dangerouslySetInnerHTML!==null&&s.dangerouslySetInnerHTML.__html!=null}var Kd=typeof setTimeout=="function"?setTimeout:void 0,DS=typeof clearTimeout=="function"?clearTimeout:void 0,Lg=typeof Promise=="function"?Promise:void 0,IS=typeof queueMicrotask=="function"?queueMicrotask:typeof Lg<"u"?function(n){return Lg.resolve(null).then(n).catch(US)}:Kd;function US(n){setTimeout(function(){throw n})}function Yd(n,s){var o=s,u=0;do{var m=o.nextSibling;if(n.removeChild(o),m&&m.nodeType===8)if(o=m.data,o==="/$"){if(u===0){n.removeChild(m),Zo(s);return}u--}else o!=="$"&&o!=="$?"&&o!=="$!"||u++;o=m}while(o);Zo(s)}function rs(n){for(;n!=null;n=n.nextSibling){var s=n.nodeType;if(s===1||s===3)break;if(s===8){if(s=n.data,s==="$"||s==="$!"||s==="$?")break;if(s==="/$")return null}}return n}function Dg(n){n=n.previousSibling;for(var s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="$"||o==="$!"||o==="$?"){if(s===0)return n;s--}else o==="/$"&&s++}n=n.previousSibling}return null}var Ia=Math.random().toString(36).slice(2),tr="__reactFiber$"+Ia,cl="__reactProps$"+Ia,wr="__reactContainer$"+Ia,Qd="__reactEvents$"+Ia,FS="__reactListeners$"+Ia,OS="__reactHandles$"+Ia;function Xs(n){var s=n[tr];if(s)return s;for(var o=n.parentNode;o;){if(s=o[wr]||o[tr]){if(o=s.alternate,s.child!==null||o!==null&&o.child!==null)for(n=Dg(n);n!==null;){if(o=n[tr])return o;n=Dg(n)}return s}n=o,o=n.parentNode}return null}function ul(n){return n=n[tr]||n[wr],!n||n.tag!==5&&n.tag!==6&&n.tag!==13&&n.tag!==3?null:n}function Ua(n){if(n.tag===5||n.tag===6)return n.stateNode;throw Error(t(33))}function wc(n){return n[cl]||null}var Zd=[],Fa=-1;function ss(n){return{current:n}}function Qt(n){0>Fa||(n.current=Zd[Fa],Zd[Fa]=null,Fa--)}function $t(n,s){Fa++,Zd[Fa]=n.current,n.current=s}var as={},On=ss(as),ni=ss(!1),$s=as;function Oa(n,s){var o=n.type.contextTypes;if(!o)return as;var u=n.stateNode;if(u&&u.__reactInternalMemoizedUnmaskedChildContext===s)return u.__reactInternalMemoizedMaskedChildContext;var m={},y;for(y in o)m[y]=s[y];return u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=s,n.__reactInternalMemoizedMaskedChildContext=m),m}function ii(n){return n=n.childContextTypes,n!=null}function bc(){Qt(ni),Qt(On)}function Ig(n,s,o){if(On.current!==as)throw Error(t(168));$t(On,s),$t(ni,o)}function Ug(n,s,o){var u=n.stateNode;if(s=s.childContextTypes,typeof u.getChildContext!="function")return o;u=u.getChildContext();for(var m in u)if(!(m in s))throw Error(t(108,xe(n)||"Unknown",m));return de({},o,u)}function Tc(n){return n=(n=n.stateNode)&&n.__reactInternalMemoizedMergedChildContext||as,$s=On.current,$t(On,n),$t(ni,ni.current),!0}function Fg(n,s,o){var u=n.stateNode;if(!u)throw Error(t(169));o?(n=Ug(n,s,$s),u.__reactInternalMemoizedMergedChildContext=n,Qt(ni),Qt(On),$t(On,n)):Qt(ni),$t(ni,o)}var br=null,Cc=!1,Jd=!1;function Og(n){br===null?br=[n]:br.push(n)}function kS(n){Cc=!0,Og(n)}function os(){if(!Jd&&br!==null){Jd=!0;var n=0,s=yt;try{var o=br;for(yt=1;n<o.length;n++){var u=o[n];do u=u(!0);while(u!==null)}br=null,Cc=!1}catch(m){throw br!==null&&(br=br.slice(n+1)),js($o,os),m}finally{yt=s,Jd=!1}}return null}var ka=[],za=0,Rc=null,Ac=0,bi=[],Ti=0,qs=null,Tr=1,Cr="";function Ks(n,s){ka[za++]=Ac,ka[za++]=Rc,Rc=n,Ac=s}function kg(n,s,o){bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=qs,qs=n;var u=Tr;n=Cr;var m=32-Re(u)-1;u&=~(1<<m),o+=1;var y=32-Re(s)+m;if(30<y){var R=m-m%5;y=(u&(1<<R)-1).toString(32),u>>=R,m-=R,Tr=1<<32-Re(s)+m|o<<m|u,Cr=y+n}else Tr=1<<y|o<<m|u,Cr=n}function eh(n){n.return!==null&&(Ks(n,1),kg(n,1,0))}function th(n){for(;n===Rc;)Rc=ka[--za],ka[za]=null,Ac=ka[--za],ka[za]=null;for(;n===qs;)qs=bi[--Ti],bi[Ti]=null,Cr=bi[--Ti],bi[Ti]=null,Tr=bi[--Ti],bi[Ti]=null}var pi=null,mi=null,tn=!1,zi=null;function zg(n,s){var o=Pi(5,null,null,0);o.elementType="DELETED",o.stateNode=s,o.return=n,s=n.deletions,s===null?(n.deletions=[o],n.flags|=16):s.push(o)}function Bg(n,s){switch(n.tag){case 5:var o=n.type;return s=s.nodeType!==1||o.toLowerCase()!==s.nodeName.toLowerCase()?null:s,s!==null?(n.stateNode=s,pi=n,mi=rs(s.firstChild),!0):!1;case 6:return s=n.pendingProps===""||s.nodeType!==3?null:s,s!==null?(n.stateNode=s,pi=n,mi=null,!0):!1;case 13:return s=s.nodeType!==8?null:s,s!==null?(o=qs!==null?{id:Tr,overflow:Cr}:null,n.memoizedState={dehydrated:s,treeContext:o,retryLane:1073741824},o=Pi(18,null,null,0),o.stateNode=s,o.return=n,n.child=o,pi=n,mi=null,!0):!1;default:return!1}}function nh(n){return(n.mode&1)!==0&&(n.flags&128)===0}function ih(n){if(tn){var s=mi;if(s){var o=s;if(!Bg(n,s)){if(nh(n))throw Error(t(418));s=rs(o.nextSibling);var u=pi;s&&Bg(n,s)?zg(u,o):(n.flags=n.flags&-4097|2,tn=!1,pi=n)}}else{if(nh(n))throw Error(t(418));n.flags=n.flags&-4097|2,tn=!1,pi=n}}}function Hg(n){for(n=n.return;n!==null&&n.tag!==5&&n.tag!==3&&n.tag!==13;)n=n.return;pi=n}function Pc(n){if(n!==pi)return!1;if(!tn)return Hg(n),tn=!0,!1;var s;if((s=n.tag!==3)&&!(s=n.tag!==5)&&(s=n.type,s=s!=="head"&&s!=="body"&&!qd(n.type,n.memoizedProps)),s&&(s=mi)){if(nh(n))throw Vg(),Error(t(418));for(;s;)zg(n,s),s=rs(s.nextSibling)}if(Hg(n),n.tag===13){if(n=n.memoizedState,n=n!==null?n.dehydrated:null,!n)throw Error(t(317));e:{for(n=n.nextSibling,s=0;n;){if(n.nodeType===8){var o=n.data;if(o==="/$"){if(s===0){mi=rs(n.nextSibling);break e}s--}else o!=="$"&&o!=="$!"&&o!=="$?"||s++}n=n.nextSibling}mi=null}}else mi=pi?rs(n.stateNode.nextSibling):null;return!0}function Vg(){for(var n=mi;n;)n=rs(n.nextSibling)}function Ba(){mi=pi=null,tn=!1}function rh(n){zi===null?zi=[n]:zi.push(n)}var zS=C.ReactCurrentBatchConfig;function dl(n,s,o){if(n=o.ref,n!==null&&typeof n!="function"&&typeof n!="object"){if(o._owner){if(o=o._owner,o){if(o.tag!==1)throw Error(t(309));var u=o.stateNode}if(!u)throw Error(t(147,n));var m=u,y=""+n;return s!==null&&s.ref!==null&&typeof s.ref=="function"&&s.ref._stringRef===y?s.ref:(s=function(R){var B=m.refs;R===null?delete B[y]:B[y]=R},s._stringRef=y,s)}if(typeof n!="string")throw Error(t(284));if(!o._owner)throw Error(t(290,n))}return n}function Nc(n,s){throw n=Object.prototype.toString.call(s),Error(t(31,n==="[object Object]"?"object with keys {"+Object.keys(s).join(", ")+"}":n))}function Gg(n){var s=n._init;return s(n._payload)}function jg(n){function s(se,Y){if(n){var ce=se.deletions;ce===null?(se.deletions=[Y],se.flags|=16):ce.push(Y)}}function o(se,Y){if(!n)return null;for(;Y!==null;)s(se,Y),Y=Y.sibling;return null}function u(se,Y){for(se=new Map;Y!==null;)Y.key!==null?se.set(Y.key,Y):se.set(Y.index,Y),Y=Y.sibling;return se}function m(se,Y){return se=ms(se,Y),se.index=0,se.sibling=null,se}function y(se,Y,ce){return se.index=ce,n?(ce=se.alternate,ce!==null?(ce=ce.index,ce<Y?(se.flags|=2,Y):ce):(se.flags|=2,Y)):(se.flags|=1048576,Y)}function R(se){return n&&se.alternate===null&&(se.flags|=2),se}function B(se,Y,ce,Te){return Y===null||Y.tag!==6?(Y=Kh(ce,se.mode,Te),Y.return=se,Y):(Y=m(Y,ce),Y.return=se,Y)}function W(se,Y,ce,Te){var et=ce.type;return et===U?Ee(se,Y,ce.props.children,Te,ce.key):Y!==null&&(Y.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ue&&Gg(et)===Y.type)?(Te=m(Y,ce.props),Te.ref=dl(se,Y,ce),Te.return=se,Te):(Te=tu(ce.type,ce.key,ce.props,null,se.mode,Te),Te.ref=dl(se,Y,ce),Te.return=se,Te)}function me(se,Y,ce,Te){return Y===null||Y.tag!==4||Y.stateNode.containerInfo!==ce.containerInfo||Y.stateNode.implementation!==ce.implementation?(Y=Yh(ce,se.mode,Te),Y.return=se,Y):(Y=m(Y,ce.children||[]),Y.return=se,Y)}function Ee(se,Y,ce,Te,et){return Y===null||Y.tag!==7?(Y=ia(ce,se.mode,Te,et),Y.return=se,Y):(Y=m(Y,ce),Y.return=se,Y)}function we(se,Y,ce){if(typeof Y=="string"&&Y!==""||typeof Y=="number")return Y=Kh(""+Y,se.mode,ce),Y.return=se,Y;if(typeof Y=="object"&&Y!==null){switch(Y.$$typeof){case I:return ce=tu(Y.type,Y.key,Y.props,null,se.mode,ce),ce.ref=dl(se,null,Y),ce.return=se,ce;case N:return Y=Yh(Y,se.mode,ce),Y.return=se,Y;case ue:var Te=Y._init;return we(se,Te(Y._payload),ce)}if(sn(Y)||re(Y))return Y=ia(Y,se.mode,ce,null),Y.return=se,Y;Nc(se,Y)}return null}function Me(se,Y,ce,Te){var et=Y!==null?Y.key:null;if(typeof ce=="string"&&ce!==""||typeof ce=="number")return et!==null?null:B(se,Y,""+ce,Te);if(typeof ce=="object"&&ce!==null){switch(ce.$$typeof){case I:return ce.key===et?W(se,Y,ce,Te):null;case N:return ce.key===et?me(se,Y,ce,Te):null;case ue:return et=ce._init,Me(se,Y,et(ce._payload),Te)}if(sn(ce)||re(ce))return et!==null?null:Ee(se,Y,ce,Te,null);Nc(se,ce)}return null}function He(se,Y,ce,Te,et){if(typeof Te=="string"&&Te!==""||typeof Te=="number")return se=se.get(ce)||null,B(Y,se,""+Te,et);if(typeof Te=="object"&&Te!==null){switch(Te.$$typeof){case I:return se=se.get(Te.key===null?ce:Te.key)||null,W(Y,se,Te,et);case N:return se=se.get(Te.key===null?ce:Te.key)||null,me(Y,se,Te,et);case ue:var st=Te._init;return He(se,Y,ce,st(Te._payload),et)}if(sn(Te)||re(Te))return se=se.get(ce)||null,Ee(Y,se,Te,et,null);Nc(Y,Te)}return null}function $e(se,Y,ce,Te){for(var et=null,st=null,at=Y,ct=Y=0,Cn=null;at!==null&&ct<ce.length;ct++){at.index>ct?(Cn=at,at=null):Cn=at.sibling;var Lt=Me(se,at,ce[ct],Te);if(Lt===null){at===null&&(at=Cn);break}n&&at&&Lt.alternate===null&&s(se,at),Y=y(Lt,Y,ct),st===null?et=Lt:st.sibling=Lt,st=Lt,at=Cn}if(ct===ce.length)return o(se,at),tn&&Ks(se,ct),et;if(at===null){for(;ct<ce.length;ct++)at=we(se,ce[ct],Te),at!==null&&(Y=y(at,Y,ct),st===null?et=at:st.sibling=at,st=at);return tn&&Ks(se,ct),et}for(at=u(se,at);ct<ce.length;ct++)Cn=He(at,se,ct,ce[ct],Te),Cn!==null&&(n&&Cn.alternate!==null&&at.delete(Cn.key===null?ct:Cn.key),Y=y(Cn,Y,ct),st===null?et=Cn:st.sibling=Cn,st=Cn);return n&&at.forEach(function(gs){return s(se,gs)}),tn&&Ks(se,ct),et}function Qe(se,Y,ce,Te){var et=re(ce);if(typeof et!="function")throw Error(t(150));if(ce=et.call(ce),ce==null)throw Error(t(151));for(var st=et=null,at=Y,ct=Y=0,Cn=null,Lt=ce.next();at!==null&&!Lt.done;ct++,Lt=ce.next()){at.index>ct?(Cn=at,at=null):Cn=at.sibling;var gs=Me(se,at,Lt.value,Te);if(gs===null){at===null&&(at=Cn);break}n&&at&&gs.alternate===null&&s(se,at),Y=y(gs,Y,ct),st===null?et=gs:st.sibling=gs,st=gs,at=Cn}if(Lt.done)return o(se,at),tn&&Ks(se,ct),et;if(at===null){for(;!Lt.done;ct++,Lt=ce.next())Lt=we(se,Lt.value,Te),Lt!==null&&(Y=y(Lt,Y,ct),st===null?et=Lt:st.sibling=Lt,st=Lt);return tn&&Ks(se,ct),et}for(at=u(se,at);!Lt.done;ct++,Lt=ce.next())Lt=He(at,se,ct,Lt.value,Te),Lt!==null&&(n&&Lt.alternate!==null&&at.delete(Lt.key===null?ct:Lt.key),Y=y(Lt,Y,ct),st===null?et=Lt:st.sibling=Lt,st=Lt);return n&&at.forEach(function(vM){return s(se,vM)}),tn&&Ks(se,ct),et}function pn(se,Y,ce,Te){if(typeof ce=="object"&&ce!==null&&ce.type===U&&ce.key===null&&(ce=ce.props.children),typeof ce=="object"&&ce!==null){switch(ce.$$typeof){case I:e:{for(var et=ce.key,st=Y;st!==null;){if(st.key===et){if(et=ce.type,et===U){if(st.tag===7){o(se,st.sibling),Y=m(st,ce.props.children),Y.return=se,se=Y;break e}}else if(st.elementType===et||typeof et=="object"&&et!==null&&et.$$typeof===ue&&Gg(et)===st.type){o(se,st.sibling),Y=m(st,ce.props),Y.ref=dl(se,st,ce),Y.return=se,se=Y;break e}o(se,st);break}else s(se,st);st=st.sibling}ce.type===U?(Y=ia(ce.props.children,se.mode,Te,ce.key),Y.return=se,se=Y):(Te=tu(ce.type,ce.key,ce.props,null,se.mode,Te),Te.ref=dl(se,Y,ce),Te.return=se,se=Te)}return R(se);case N:e:{for(st=ce.key;Y!==null;){if(Y.key===st)if(Y.tag===4&&Y.stateNode.containerInfo===ce.containerInfo&&Y.stateNode.implementation===ce.implementation){o(se,Y.sibling),Y=m(Y,ce.children||[]),Y.return=se,se=Y;break e}else{o(se,Y);break}else s(se,Y);Y=Y.sibling}Y=Yh(ce,se.mode,Te),Y.return=se,se=Y}return R(se);case ue:return st=ce._init,pn(se,Y,st(ce._payload),Te)}if(sn(ce))return $e(se,Y,ce,Te);if(re(ce))return Qe(se,Y,ce,Te);Nc(se,ce)}return typeof ce=="string"&&ce!==""||typeof ce=="number"?(ce=""+ce,Y!==null&&Y.tag===6?(o(se,Y.sibling),Y=m(Y,ce),Y.return=se,se=Y):(o(se,Y),Y=Kh(ce,se.mode,Te),Y.return=se,se=Y),R(se)):o(se,Y)}return pn}var Ha=jg(!0),Wg=jg(!1),Lc=ss(null),Dc=null,Va=null,sh=null;function ah(){sh=Va=Dc=null}function oh(n){var s=Lc.current;Qt(Lc),n._currentValue=s}function lh(n,s,o){for(;n!==null;){var u=n.alternate;if((n.childLanes&s)!==s?(n.childLanes|=s,u!==null&&(u.childLanes|=s)):u!==null&&(u.childLanes&s)!==s&&(u.childLanes|=s),n===o)break;n=n.return}}function Ga(n,s){Dc=n,sh=Va=null,n=n.dependencies,n!==null&&n.firstContext!==null&&((n.lanes&s)!==0&&(ri=!0),n.firstContext=null)}function Ci(n){var s=n._currentValue;if(sh!==n)if(n={context:n,memoizedValue:s,next:null},Va===null){if(Dc===null)throw Error(t(308));Va=n,Dc.dependencies={lanes:0,firstContext:n}}else Va=Va.next=n;return s}var Ys=null;function ch(n){Ys===null?Ys=[n]:Ys.push(n)}function Xg(n,s,o,u){var m=s.interleaved;return m===null?(o.next=o,ch(s)):(o.next=m.next,m.next=o),s.interleaved=o,Rr(n,u)}function Rr(n,s){n.lanes|=s;var o=n.alternate;for(o!==null&&(o.lanes|=s),o=n,n=n.return;n!==null;)n.childLanes|=s,o=n.alternate,o!==null&&(o.childLanes|=s),o=n,n=n.return;return o.tag===3?o.stateNode:null}var ls=!1;function uh(n){n.updateQueue={baseState:n.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function $g(n,s){n=n.updateQueue,s.updateQueue===n&&(s.updateQueue={baseState:n.baseState,firstBaseUpdate:n.firstBaseUpdate,lastBaseUpdate:n.lastBaseUpdate,shared:n.shared,effects:n.effects})}function Ar(n,s){return{eventTime:n,lane:s,tag:0,payload:null,callback:null,next:null}}function cs(n,s,o){var u=n.updateQueue;if(u===null)return null;if(u=u.shared,(At&2)!==0){var m=u.pending;return m===null?s.next=s:(s.next=m.next,m.next=s),u.pending=s,Rr(n,o)}return m=u.interleaved,m===null?(s.next=s,ch(u)):(s.next=m.next,m.next=s),u.interleaved=s,Rr(n,o)}function Ic(n,s,o){if(s=s.updateQueue,s!==null&&(s=s.shared,(o&4194240)!==0)){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}function qg(n,s){var o=n.updateQueue,u=n.alternate;if(u!==null&&(u=u.updateQueue,o===u)){var m=null,y=null;if(o=o.firstBaseUpdate,o!==null){do{var R={eventTime:o.eventTime,lane:o.lane,tag:o.tag,payload:o.payload,callback:o.callback,next:null};y===null?m=y=R:y=y.next=R,o=o.next}while(o!==null);y===null?m=y=s:y=y.next=s}else m=y=s;o={baseState:u.baseState,firstBaseUpdate:m,lastBaseUpdate:y,shared:u.shared,effects:u.effects},n.updateQueue=o;return}n=o.lastBaseUpdate,n===null?o.firstBaseUpdate=s:n.next=s,o.lastBaseUpdate=s}function Uc(n,s,o,u){var m=n.updateQueue;ls=!1;var y=m.firstBaseUpdate,R=m.lastBaseUpdate,B=m.shared.pending;if(B!==null){m.shared.pending=null;var W=B,me=W.next;W.next=null,R===null?y=me:R.next=me,R=W;var Ee=n.alternate;Ee!==null&&(Ee=Ee.updateQueue,B=Ee.lastBaseUpdate,B!==R&&(B===null?Ee.firstBaseUpdate=me:B.next=me,Ee.lastBaseUpdate=W))}if(y!==null){var we=m.baseState;R=0,Ee=me=W=null,B=y;do{var Me=B.lane,He=B.eventTime;if((u&Me)===Me){Ee!==null&&(Ee=Ee.next={eventTime:He,lane:0,tag:B.tag,payload:B.payload,callback:B.callback,next:null});e:{var $e=n,Qe=B;switch(Me=s,He=o,Qe.tag){case 1:if($e=Qe.payload,typeof $e=="function"){we=$e.call(He,we,Me);break e}we=$e;break e;case 3:$e.flags=$e.flags&-65537|128;case 0:if($e=Qe.payload,Me=typeof $e=="function"?$e.call(He,we,Me):$e,Me==null)break e;we=de({},we,Me);break e;case 2:ls=!0}}B.callback!==null&&B.lane!==0&&(n.flags|=64,Me=m.effects,Me===null?m.effects=[B]:Me.push(B))}else He={eventTime:He,lane:Me,tag:B.tag,payload:B.payload,callback:B.callback,next:null},Ee===null?(me=Ee=He,W=we):Ee=Ee.next=He,R|=Me;if(B=B.next,B===null){if(B=m.shared.pending,B===null)break;Me=B,B=Me.next,Me.next=null,m.lastBaseUpdate=Me,m.shared.pending=null}}while(!0);if(Ee===null&&(W=we),m.baseState=W,m.firstBaseUpdate=me,m.lastBaseUpdate=Ee,s=m.shared.interleaved,s!==null){m=s;do R|=m.lane,m=m.next;while(m!==s)}else y===null&&(m.shared.lanes=0);Js|=R,n.lanes=R,n.memoizedState=we}}function Kg(n,s,o){if(n=s.effects,s.effects=null,n!==null)for(s=0;s<n.length;s++){var u=n[s],m=u.callback;if(m!==null){if(u.callback=null,u=o,typeof m!="function")throw Error(t(191,m));m.call(u)}}}var hl={},nr=ss(hl),fl=ss(hl),pl=ss(hl);function Qs(n){if(n===hl)throw Error(t(174));return n}function dh(n,s){switch($t(pl,s),$t(fl,n),$t(nr,hl),n=s.nodeType,n){case 9:case 11:s=(s=s.documentElement)?s.namespaceURI:T(null,"");break;default:n=n===8?s.parentNode:s,s=n.namespaceURI||null,n=n.tagName,s=T(s,n)}Qt(nr),$t(nr,s)}function ja(){Qt(nr),Qt(fl),Qt(pl)}function Yg(n){Qs(pl.current);var s=Qs(nr.current),o=T(s,n.type);s!==o&&($t(fl,n),$t(nr,o))}function hh(n){fl.current===n&&(Qt(nr),Qt(fl))}var on=ss(0);function Fc(n){for(var s=n;s!==null;){if(s.tag===13){var o=s.memoizedState;if(o!==null&&(o=o.dehydrated,o===null||o.data==="$?"||o.data==="$!"))return s}else if(s.tag===19&&s.memoizedProps.revealOrder!==void 0){if((s.flags&128)!==0)return s}else if(s.child!==null){s.child.return=s,s=s.child;continue}if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return null;s=s.return}s.sibling.return=s.return,s=s.sibling}return null}var fh=[];function ph(){for(var n=0;n<fh.length;n++)fh[n]._workInProgressVersionPrimary=null;fh.length=0}var Oc=C.ReactCurrentDispatcher,mh=C.ReactCurrentBatchConfig,Zs=0,ln=null,vn=null,bn=null,kc=!1,ml=!1,gl=0,BS=0;function kn(){throw Error(t(321))}function gh(n,s){if(s===null)return!1;for(var o=0;o<s.length&&o<n.length;o++)if(!ki(n[o],s[o]))return!1;return!0}function xh(n,s,o,u,m,y){if(Zs=y,ln=s,s.memoizedState=null,s.updateQueue=null,s.lanes=0,Oc.current=n===null||n.memoizedState===null?jS:WS,n=o(u,m),ml){y=0;do{if(ml=!1,gl=0,25<=y)throw Error(t(301));y+=1,bn=vn=null,s.updateQueue=null,Oc.current=XS,n=o(u,m)}while(ml)}if(Oc.current=Hc,s=vn!==null&&vn.next!==null,Zs=0,bn=vn=ln=null,kc=!1,s)throw Error(t(300));return n}function vh(){var n=gl!==0;return gl=0,n}function ir(){var n={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return bn===null?ln.memoizedState=bn=n:bn=bn.next=n,bn}function Ri(){if(vn===null){var n=ln.alternate;n=n!==null?n.memoizedState:null}else n=vn.next;var s=bn===null?ln.memoizedState:bn.next;if(s!==null)bn=s,vn=n;else{if(n===null)throw Error(t(310));vn=n,n={memoizedState:vn.memoizedState,baseState:vn.baseState,baseQueue:vn.baseQueue,queue:vn.queue,next:null},bn===null?ln.memoizedState=bn=n:bn=bn.next=n}return bn}function xl(n,s){return typeof s=="function"?s(n):s}function _h(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=vn,m=u.baseQueue,y=o.pending;if(y!==null){if(m!==null){var R=m.next;m.next=y.next,y.next=R}u.baseQueue=m=y,o.pending=null}if(m!==null){y=m.next,u=u.baseState;var B=R=null,W=null,me=y;do{var Ee=me.lane;if((Zs&Ee)===Ee)W!==null&&(W=W.next={lane:0,action:me.action,hasEagerState:me.hasEagerState,eagerState:me.eagerState,next:null}),u=me.hasEagerState?me.eagerState:n(u,me.action);else{var we={lane:Ee,action:me.action,hasEagerState:me.hasEagerState,eagerState:me.eagerState,next:null};W===null?(B=W=we,R=u):W=W.next=we,ln.lanes|=Ee,Js|=Ee}me=me.next}while(me!==null&&me!==y);W===null?R=u:W.next=B,ki(u,s.memoizedState)||(ri=!0),s.memoizedState=u,s.baseState=R,s.baseQueue=W,o.lastRenderedState=u}if(n=o.interleaved,n!==null){m=n;do y=m.lane,ln.lanes|=y,Js|=y,m=m.next;while(m!==n)}else m===null&&(o.lanes=0);return[s.memoizedState,o.dispatch]}function yh(n){var s=Ri(),o=s.queue;if(o===null)throw Error(t(311));o.lastRenderedReducer=n;var u=o.dispatch,m=o.pending,y=s.memoizedState;if(m!==null){o.pending=null;var R=m=m.next;do y=n(y,R.action),R=R.next;while(R!==m);ki(y,s.memoizedState)||(ri=!0),s.memoizedState=y,s.baseQueue===null&&(s.baseState=y),o.lastRenderedState=y}return[y,u]}function Qg(){}function Zg(n,s){var o=ln,u=Ri(),m=s(),y=!ki(u.memoizedState,m);if(y&&(u.memoizedState=m,ri=!0),u=u.queue,Sh(t0.bind(null,o,u,n),[n]),u.getSnapshot!==s||y||bn!==null&&bn.memoizedState.tag&1){if(o.flags|=2048,vl(9,e0.bind(null,o,u,m,s),void 0,null),Tn===null)throw Error(t(349));(Zs&30)!==0||Jg(o,s,m)}return m}function Jg(n,s,o){n.flags|=16384,n={getSnapshot:s,value:o},s=ln.updateQueue,s===null?(s={lastEffect:null,stores:null},ln.updateQueue=s,s.stores=[n]):(o=s.stores,o===null?s.stores=[n]:o.push(n))}function e0(n,s,o,u){s.value=o,s.getSnapshot=u,n0(s)&&i0(n)}function t0(n,s,o){return o(function(){n0(s)&&i0(n)})}function n0(n){var s=n.getSnapshot;n=n.value;try{var o=s();return!ki(n,o)}catch{return!0}}function i0(n){var s=Rr(n,1);s!==null&&Gi(s,n,1,-1)}function r0(n){var s=ir();return typeof n=="function"&&(n=n()),s.memoizedState=s.baseState=n,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:xl,lastRenderedState:n},s.queue=n,n=n.dispatch=GS.bind(null,ln,n),[s.memoizedState,n]}function vl(n,s,o,u){return n={tag:n,create:s,destroy:o,deps:u,next:null},s=ln.updateQueue,s===null?(s={lastEffect:null,stores:null},ln.updateQueue=s,s.lastEffect=n.next=n):(o=s.lastEffect,o===null?s.lastEffect=n.next=n:(u=o.next,o.next=n,n.next=u,s.lastEffect=n)),n}function s0(){return Ri().memoizedState}function zc(n,s,o,u){var m=ir();ln.flags|=n,m.memoizedState=vl(1|s,o,void 0,u===void 0?null:u)}function Bc(n,s,o,u){var m=Ri();u=u===void 0?null:u;var y=void 0;if(vn!==null){var R=vn.memoizedState;if(y=R.destroy,u!==null&&gh(u,R.deps)){m.memoizedState=vl(s,o,y,u);return}}ln.flags|=n,m.memoizedState=vl(1|s,o,y,u)}function a0(n,s){return zc(8390656,8,n,s)}function Sh(n,s){return Bc(2048,8,n,s)}function o0(n,s){return Bc(4,2,n,s)}function l0(n,s){return Bc(4,4,n,s)}function c0(n,s){if(typeof s=="function")return n=n(),s(n),function(){s(null)};if(s!=null)return n=n(),s.current=n,function(){s.current=null}}function u0(n,s,o){return o=o!=null?o.concat([n]):null,Bc(4,4,c0.bind(null,s,n),o)}function Mh(){}function d0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&gh(s,u[1])?u[0]:(o.memoizedState=[n,s],n)}function h0(n,s){var o=Ri();s=s===void 0?null:s;var u=o.memoizedState;return u!==null&&s!==null&&gh(s,u[1])?u[0]:(n=n(),o.memoizedState=[n,s],n)}function f0(n,s,o){return(Zs&21)===0?(n.baseState&&(n.baseState=!1,ri=!0),n.memoizedState=o):(ki(o,s)||(o=Be(),ln.lanes|=o,Js|=o,n.baseState=!0),s)}function HS(n,s){var o=yt;yt=o!==0&&4>o?o:4,n(!0);var u=mh.transition;mh.transition={};try{n(!1),s()}finally{yt=o,mh.transition=u}}function p0(){return Ri().memoizedState}function VS(n,s,o){var u=fs(n);if(o={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null},m0(n))g0(s,o);else if(o=Xg(n,s,o,u),o!==null){var m=qn();Gi(o,n,u,m),x0(o,s,u)}}function GS(n,s,o){var u=fs(n),m={lane:u,action:o,hasEagerState:!1,eagerState:null,next:null};if(m0(n))g0(s,m);else{var y=n.alternate;if(n.lanes===0&&(y===null||y.lanes===0)&&(y=s.lastRenderedReducer,y!==null))try{var R=s.lastRenderedState,B=y(R,o);if(m.hasEagerState=!0,m.eagerState=B,ki(B,R)){var W=s.interleaved;W===null?(m.next=m,ch(s)):(m.next=W.next,W.next=m),s.interleaved=m;return}}catch{}finally{}o=Xg(n,s,m,u),o!==null&&(m=qn(),Gi(o,n,u,m),x0(o,s,u))}}function m0(n){var s=n.alternate;return n===ln||s!==null&&s===ln}function g0(n,s){ml=kc=!0;var o=n.pending;o===null?s.next=s:(s.next=o.next,o.next=s),n.pending=s}function x0(n,s,o){if((o&4194240)!==0){var u=s.lanes;u&=n.pendingLanes,o|=u,s.lanes=o,ti(n,o)}}var Hc={readContext:Ci,useCallback:kn,useContext:kn,useEffect:kn,useImperativeHandle:kn,useInsertionEffect:kn,useLayoutEffect:kn,useMemo:kn,useReducer:kn,useRef:kn,useState:kn,useDebugValue:kn,useDeferredValue:kn,useTransition:kn,useMutableSource:kn,useSyncExternalStore:kn,useId:kn,unstable_isNewReconciler:!1},jS={readContext:Ci,useCallback:function(n,s){return ir().memoizedState=[n,s===void 0?null:s],n},useContext:Ci,useEffect:a0,useImperativeHandle:function(n,s,o){return o=o!=null?o.concat([n]):null,zc(4194308,4,c0.bind(null,s,n),o)},useLayoutEffect:function(n,s){return zc(4194308,4,n,s)},useInsertionEffect:function(n,s){return zc(4,2,n,s)},useMemo:function(n,s){var o=ir();return s=s===void 0?null:s,n=n(),o.memoizedState=[n,s],n},useReducer:function(n,s,o){var u=ir();return s=o!==void 0?o(s):s,u.memoizedState=u.baseState=s,n={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:n,lastRenderedState:s},u.queue=n,n=n.dispatch=VS.bind(null,ln,n),[u.memoizedState,n]},useRef:function(n){var s=ir();return n={current:n},s.memoizedState=n},useState:r0,useDebugValue:Mh,useDeferredValue:function(n){return ir().memoizedState=n},useTransition:function(){var n=r0(!1),s=n[0];return n=HS.bind(null,n[1]),ir().memoizedState=n,[s,n]},useMutableSource:function(){},useSyncExternalStore:function(n,s,o){var u=ln,m=ir();if(tn){if(o===void 0)throw Error(t(407));o=o()}else{if(o=s(),Tn===null)throw Error(t(349));(Zs&30)!==0||Jg(u,s,o)}m.memoizedState=o;var y={value:o,getSnapshot:s};return m.queue=y,a0(t0.bind(null,u,y,n),[n]),u.flags|=2048,vl(9,e0.bind(null,u,y,o,s),void 0,null),o},useId:function(){var n=ir(),s=Tn.identifierPrefix;if(tn){var o=Cr,u=Tr;o=(u&~(1<<32-Re(u)-1)).toString(32)+o,s=":"+s+"R"+o,o=gl++,0<o&&(s+="H"+o.toString(32)),s+=":"}else o=BS++,s=":"+s+"r"+o.toString(32)+":";return n.memoizedState=s},unstable_isNewReconciler:!1},WS={readContext:Ci,useCallback:d0,useContext:Ci,useEffect:Sh,useImperativeHandle:u0,useInsertionEffect:o0,useLayoutEffect:l0,useMemo:h0,useReducer:_h,useRef:s0,useState:function(){return _h(xl)},useDebugValue:Mh,useDeferredValue:function(n){var s=Ri();return f0(s,vn.memoizedState,n)},useTransition:function(){var n=_h(xl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Qg,useSyncExternalStore:Zg,useId:p0,unstable_isNewReconciler:!1},XS={readContext:Ci,useCallback:d0,useContext:Ci,useEffect:Sh,useImperativeHandle:u0,useInsertionEffect:o0,useLayoutEffect:l0,useMemo:h0,useReducer:yh,useRef:s0,useState:function(){return yh(xl)},useDebugValue:Mh,useDeferredValue:function(n){var s=Ri();return vn===null?s.memoizedState=n:f0(s,vn.memoizedState,n)},useTransition:function(){var n=yh(xl)[0],s=Ri().memoizedState;return[n,s]},useMutableSource:Qg,useSyncExternalStore:Zg,useId:p0,unstable_isNewReconciler:!1};function Bi(n,s){if(n&&n.defaultProps){s=de({},s),n=n.defaultProps;for(var o in n)s[o]===void 0&&(s[o]=n[o]);return s}return s}function Eh(n,s,o,u){s=n.memoizedState,o=o(u,s),o=o==null?s:de({},s,o),n.memoizedState=o,n.lanes===0&&(n.updateQueue.baseState=o)}var Vc={isMounted:function(n){return(n=n._reactInternals)?Xn(n)===n:!1},enqueueSetState:function(n,s,o){n=n._reactInternals;var u=qn(),m=fs(n),y=Ar(u,m);y.payload=s,o!=null&&(y.callback=o),s=cs(n,y,m),s!==null&&(Gi(s,n,m,u),Ic(s,n,m))},enqueueReplaceState:function(n,s,o){n=n._reactInternals;var u=qn(),m=fs(n),y=Ar(u,m);y.tag=1,y.payload=s,o!=null&&(y.callback=o),s=cs(n,y,m),s!==null&&(Gi(s,n,m,u),Ic(s,n,m))},enqueueForceUpdate:function(n,s){n=n._reactInternals;var o=qn(),u=fs(n),m=Ar(o,u);m.tag=2,s!=null&&(m.callback=s),s=cs(n,m,u),s!==null&&(Gi(s,n,u,o),Ic(s,n,u))}};function v0(n,s,o,u,m,y,R){return n=n.stateNode,typeof n.shouldComponentUpdate=="function"?n.shouldComponentUpdate(u,y,R):s.prototype&&s.prototype.isPureReactComponent?!rl(o,u)||!rl(m,y):!0}function _0(n,s,o){var u=!1,m=as,y=s.contextType;return typeof y=="object"&&y!==null?y=Ci(y):(m=ii(s)?$s:On.current,u=s.contextTypes,y=(u=u!=null)?Oa(n,m):as),s=new s(o,y),n.memoizedState=s.state!==null&&s.state!==void 0?s.state:null,s.updater=Vc,n.stateNode=s,s._reactInternals=n,u&&(n=n.stateNode,n.__reactInternalMemoizedUnmaskedChildContext=m,n.__reactInternalMemoizedMaskedChildContext=y),s}function y0(n,s,o,u){n=s.state,typeof s.componentWillReceiveProps=="function"&&s.componentWillReceiveProps(o,u),typeof s.UNSAFE_componentWillReceiveProps=="function"&&s.UNSAFE_componentWillReceiveProps(o,u),s.state!==n&&Vc.enqueueReplaceState(s,s.state,null)}function wh(n,s,o,u){var m=n.stateNode;m.props=o,m.state=n.memoizedState,m.refs={},uh(n);var y=s.contextType;typeof y=="object"&&y!==null?m.context=Ci(y):(y=ii(s)?$s:On.current,m.context=Oa(n,y)),m.state=n.memoizedState,y=s.getDerivedStateFromProps,typeof y=="function"&&(Eh(n,s,y,o),m.state=n.memoizedState),typeof s.getDerivedStateFromProps=="function"||typeof m.getSnapshotBeforeUpdate=="function"||typeof m.UNSAFE_componentWillMount!="function"&&typeof m.componentWillMount!="function"||(s=m.state,typeof m.componentWillMount=="function"&&m.componentWillMount(),typeof m.UNSAFE_componentWillMount=="function"&&m.UNSAFE_componentWillMount(),s!==m.state&&Vc.enqueueReplaceState(m,m.state,null),Uc(n,o,m,u),m.state=n.memoizedState),typeof m.componentDidMount=="function"&&(n.flags|=4194308)}function Wa(n,s){try{var o="",u=s;do o+=Ge(u),u=u.return;while(u);var m=o}catch(y){m=`
Error generating stack: `+y.message+`
`+y.stack}return{value:n,source:s,stack:m,digest:null}}function bh(n,s,o){return{value:n,source:null,stack:o??null,digest:s??null}}function Th(n,s){try{console.error(s.value)}catch(o){setTimeout(function(){throw o})}}var $S=typeof WeakMap=="function"?WeakMap:Map;function S0(n,s,o){o=Ar(-1,o),o.tag=3,o.payload={element:null};var u=s.value;return o.callback=function(){Kc||(Kc=!0,Hh=u),Th(n,s)},o}function M0(n,s,o){o=Ar(-1,o),o.tag=3;var u=n.type.getDerivedStateFromError;if(typeof u=="function"){var m=s.value;o.payload=function(){return u(m)},o.callback=function(){Th(n,s)}}var y=n.stateNode;return y!==null&&typeof y.componentDidCatch=="function"&&(o.callback=function(){Th(n,s),typeof u!="function"&&(ds===null?ds=new Set([this]):ds.add(this));var R=s.stack;this.componentDidCatch(s.value,{componentStack:R!==null?R:""})}),o}function E0(n,s,o){var u=n.pingCache;if(u===null){u=n.pingCache=new $S;var m=new Set;u.set(s,m)}else m=u.get(s),m===void 0&&(m=new Set,u.set(s,m));m.has(o)||(m.add(o),n=oM.bind(null,n,s,o),s.then(n,n))}function w0(n){do{var s;if((s=n.tag===13)&&(s=n.memoizedState,s=s!==null?s.dehydrated!==null:!0),s)return n;n=n.return}while(n!==null);return null}function b0(n,s,o,u,m){return(n.mode&1)===0?(n===s?n.flags|=65536:(n.flags|=128,o.flags|=131072,o.flags&=-52805,o.tag===1&&(o.alternate===null?o.tag=17:(s=Ar(-1,1),s.tag=2,cs(o,s,1))),o.lanes|=1),n):(n.flags|=65536,n.lanes=m,n)}var qS=C.ReactCurrentOwner,ri=!1;function $n(n,s,o,u){s.child=n===null?Wg(s,null,o,u):Ha(s,n.child,o,u)}function T0(n,s,o,u,m){o=o.render;var y=s.ref;return Ga(s,m),u=xh(n,s,o,u,y,m),o=vh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~m,Pr(n,s,m)):(tn&&o&&eh(s),s.flags|=1,$n(n,s,u,m),s.child)}function C0(n,s,o,u,m){if(n===null){var y=o.type;return typeof y=="function"&&!qh(y)&&y.defaultProps===void 0&&o.compare===null&&o.defaultProps===void 0?(s.tag=15,s.type=y,R0(n,s,y,u,m)):(n=tu(o.type,null,u,s,s.mode,m),n.ref=s.ref,n.return=s,s.child=n)}if(y=n.child,(n.lanes&m)===0){var R=y.memoizedProps;if(o=o.compare,o=o!==null?o:rl,o(R,u)&&n.ref===s.ref)return Pr(n,s,m)}return s.flags|=1,n=ms(y,u),n.ref=s.ref,n.return=s,s.child=n}function R0(n,s,o,u,m){if(n!==null){var y=n.memoizedProps;if(rl(y,u)&&n.ref===s.ref)if(ri=!1,s.pendingProps=u=y,(n.lanes&m)!==0)(n.flags&131072)!==0&&(ri=!0);else return s.lanes=n.lanes,Pr(n,s,m)}return Ch(n,s,o,u,m)}function A0(n,s,o){var u=s.pendingProps,m=u.children,y=n!==null?n.memoizedState:null;if(u.mode==="hidden")if((s.mode&1)===0)s.memoizedState={baseLanes:0,cachePool:null,transitions:null},$t($a,gi),gi|=o;else{if((o&1073741824)===0)return n=y!==null?y.baseLanes|o:o,s.lanes=s.childLanes=1073741824,s.memoizedState={baseLanes:n,cachePool:null,transitions:null},s.updateQueue=null,$t($a,gi),gi|=n,null;s.memoizedState={baseLanes:0,cachePool:null,transitions:null},u=y!==null?y.baseLanes:o,$t($a,gi),gi|=u}else y!==null?(u=y.baseLanes|o,s.memoizedState=null):u=o,$t($a,gi),gi|=u;return $n(n,s,m,o),s.child}function P0(n,s){var o=s.ref;(n===null&&o!==null||n!==null&&n.ref!==o)&&(s.flags|=512,s.flags|=2097152)}function Ch(n,s,o,u,m){var y=ii(o)?$s:On.current;return y=Oa(s,y),Ga(s,m),o=xh(n,s,o,u,y,m),u=vh(),n!==null&&!ri?(s.updateQueue=n.updateQueue,s.flags&=-2053,n.lanes&=~m,Pr(n,s,m)):(tn&&u&&eh(s),s.flags|=1,$n(n,s,o,m),s.child)}function N0(n,s,o,u,m){if(ii(o)){var y=!0;Tc(s)}else y=!1;if(Ga(s,m),s.stateNode===null)jc(n,s),_0(s,o,u),wh(s,o,u,m),u=!0;else if(n===null){var R=s.stateNode,B=s.memoizedProps;R.props=B;var W=R.context,me=o.contextType;typeof me=="object"&&me!==null?me=Ci(me):(me=ii(o)?$s:On.current,me=Oa(s,me));var Ee=o.getDerivedStateFromProps,we=typeof Ee=="function"||typeof R.getSnapshotBeforeUpdate=="function";we||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==u||W!==me)&&y0(s,R,u,me),ls=!1;var Me=s.memoizedState;R.state=Me,Uc(s,u,R,m),W=s.memoizedState,B!==u||Me!==W||ni.current||ls?(typeof Ee=="function"&&(Eh(s,o,Ee,u),W=s.memoizedState),(B=ls||v0(s,o,B,u,Me,W,me))?(we||typeof R.UNSAFE_componentWillMount!="function"&&typeof R.componentWillMount!="function"||(typeof R.componentWillMount=="function"&&R.componentWillMount(),typeof R.UNSAFE_componentWillMount=="function"&&R.UNSAFE_componentWillMount()),typeof R.componentDidMount=="function"&&(s.flags|=4194308)):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),s.memoizedProps=u,s.memoizedState=W),R.props=u,R.state=W,R.context=me,u=B):(typeof R.componentDidMount=="function"&&(s.flags|=4194308),u=!1)}else{R=s.stateNode,$g(n,s),B=s.memoizedProps,me=s.type===s.elementType?B:Bi(s.type,B),R.props=me,we=s.pendingProps,Me=R.context,W=o.contextType,typeof W=="object"&&W!==null?W=Ci(W):(W=ii(o)?$s:On.current,W=Oa(s,W));var He=o.getDerivedStateFromProps;(Ee=typeof He=="function"||typeof R.getSnapshotBeforeUpdate=="function")||typeof R.UNSAFE_componentWillReceiveProps!="function"&&typeof R.componentWillReceiveProps!="function"||(B!==we||Me!==W)&&y0(s,R,u,W),ls=!1,Me=s.memoizedState,R.state=Me,Uc(s,u,R,m);var $e=s.memoizedState;B!==we||Me!==$e||ni.current||ls?(typeof He=="function"&&(Eh(s,o,He,u),$e=s.memoizedState),(me=ls||v0(s,o,me,u,Me,$e,W)||!1)?(Ee||typeof R.UNSAFE_componentWillUpdate!="function"&&typeof R.componentWillUpdate!="function"||(typeof R.componentWillUpdate=="function"&&R.componentWillUpdate(u,$e,W),typeof R.UNSAFE_componentWillUpdate=="function"&&R.UNSAFE_componentWillUpdate(u,$e,W)),typeof R.componentDidUpdate=="function"&&(s.flags|=4),typeof R.getSnapshotBeforeUpdate=="function"&&(s.flags|=1024)):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&Me===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&Me===n.memoizedState||(s.flags|=1024),s.memoizedProps=u,s.memoizedState=$e),R.props=u,R.state=$e,R.context=W,u=me):(typeof R.componentDidUpdate!="function"||B===n.memoizedProps&&Me===n.memoizedState||(s.flags|=4),typeof R.getSnapshotBeforeUpdate!="function"||B===n.memoizedProps&&Me===n.memoizedState||(s.flags|=1024),u=!1)}return Rh(n,s,o,u,y,m)}function Rh(n,s,o,u,m,y){P0(n,s);var R=(s.flags&128)!==0;if(!u&&!R)return m&&Fg(s,o,!1),Pr(n,s,y);u=s.stateNode,qS.current=s;var B=R&&typeof o.getDerivedStateFromError!="function"?null:u.render();return s.flags|=1,n!==null&&R?(s.child=Ha(s,n.child,null,y),s.child=Ha(s,null,B,y)):$n(n,s,B,y),s.memoizedState=u.state,m&&Fg(s,o,!0),s.child}function L0(n){var s=n.stateNode;s.pendingContext?Ig(n,s.pendingContext,s.pendingContext!==s.context):s.context&&Ig(n,s.context,!1),dh(n,s.containerInfo)}function D0(n,s,o,u,m){return Ba(),rh(m),s.flags|=256,$n(n,s,o,u),s.child}var Ah={dehydrated:null,treeContext:null,retryLane:0};function Ph(n){return{baseLanes:n,cachePool:null,transitions:null}}function I0(n,s,o){var u=s.pendingProps,m=on.current,y=!1,R=(s.flags&128)!==0,B;if((B=R)||(B=n!==null&&n.memoizedState===null?!1:(m&2)!==0),B?(y=!0,s.flags&=-129):(n===null||n.memoizedState!==null)&&(m|=1),$t(on,m&1),n===null)return ih(s),n=s.memoizedState,n!==null&&(n=n.dehydrated,n!==null)?((s.mode&1)===0?s.lanes=1:n.data==="$!"?s.lanes=8:s.lanes=1073741824,null):(R=u.children,n=u.fallback,y?(u=s.mode,y=s.child,R={mode:"hidden",children:R},(u&1)===0&&y!==null?(y.childLanes=0,y.pendingProps=R):y=nu(R,u,0,null),n=ia(n,u,o,null),y.return=s,n.return=s,y.sibling=n,s.child=y,s.child.memoizedState=Ph(o),s.memoizedState=Ah,n):Nh(s,R));if(m=n.memoizedState,m!==null&&(B=m.dehydrated,B!==null))return KS(n,s,R,u,B,m,o);if(y){y=u.fallback,R=s.mode,m=n.child,B=m.sibling;var W={mode:"hidden",children:u.children};return(R&1)===0&&s.child!==m?(u=s.child,u.childLanes=0,u.pendingProps=W,s.deletions=null):(u=ms(m,W),u.subtreeFlags=m.subtreeFlags&14680064),B!==null?y=ms(B,y):(y=ia(y,R,o,null),y.flags|=2),y.return=s,u.return=s,u.sibling=y,s.child=u,u=y,y=s.child,R=n.child.memoizedState,R=R===null?Ph(o):{baseLanes:R.baseLanes|o,cachePool:null,transitions:R.transitions},y.memoizedState=R,y.childLanes=n.childLanes&~o,s.memoizedState=Ah,u}return y=n.child,n=y.sibling,u=ms(y,{mode:"visible",children:u.children}),(s.mode&1)===0&&(u.lanes=o),u.return=s,u.sibling=null,n!==null&&(o=s.deletions,o===null?(s.deletions=[n],s.flags|=16):o.push(n)),s.child=u,s.memoizedState=null,u}function Nh(n,s){return s=nu({mode:"visible",children:s},n.mode,0,null),s.return=n,n.child=s}function Gc(n,s,o,u){return u!==null&&rh(u),Ha(s,n.child,null,o),n=Nh(s,s.pendingProps.children),n.flags|=2,s.memoizedState=null,n}function KS(n,s,o,u,m,y,R){if(o)return s.flags&256?(s.flags&=-257,u=bh(Error(t(422))),Gc(n,s,R,u)):s.memoizedState!==null?(s.child=n.child,s.flags|=128,null):(y=u.fallback,m=s.mode,u=nu({mode:"visible",children:u.children},m,0,null),y=ia(y,m,R,null),y.flags|=2,u.return=s,y.return=s,u.sibling=y,s.child=u,(s.mode&1)!==0&&Ha(s,n.child,null,R),s.child.memoizedState=Ph(R),s.memoizedState=Ah,y);if((s.mode&1)===0)return Gc(n,s,R,null);if(m.data==="$!"){if(u=m.nextSibling&&m.nextSibling.dataset,u)var B=u.dgst;return u=B,y=Error(t(419)),u=bh(y,u,void 0),Gc(n,s,R,u)}if(B=(R&n.childLanes)!==0,ri||B){if(u=Tn,u!==null){switch(R&-R){case 4:m=2;break;case 16:m=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:m=32;break;case 536870912:m=268435456;break;default:m=0}m=(m&(u.suspendedLanes|R))!==0?0:m,m!==0&&m!==y.retryLane&&(y.retryLane=m,Rr(n,m),Gi(u,n,m,-1))}return $h(),u=bh(Error(t(421))),Gc(n,s,R,u)}return m.data==="$?"?(s.flags|=128,s.child=n.child,s=lM.bind(null,n),m._reactRetry=s,null):(n=y.treeContext,mi=rs(m.nextSibling),pi=s,tn=!0,zi=null,n!==null&&(bi[Ti++]=Tr,bi[Ti++]=Cr,bi[Ti++]=qs,Tr=n.id,Cr=n.overflow,qs=s),s=Nh(s,u.children),s.flags|=4096,s)}function U0(n,s,o){n.lanes|=s;var u=n.alternate;u!==null&&(u.lanes|=s),lh(n.return,s,o)}function Lh(n,s,o,u,m){var y=n.memoizedState;y===null?n.memoizedState={isBackwards:s,rendering:null,renderingStartTime:0,last:u,tail:o,tailMode:m}:(y.isBackwards=s,y.rendering=null,y.renderingStartTime=0,y.last=u,y.tail=o,y.tailMode=m)}function F0(n,s,o){var u=s.pendingProps,m=u.revealOrder,y=u.tail;if($n(n,s,u.children,o),u=on.current,(u&2)!==0)u=u&1|2,s.flags|=128;else{if(n!==null&&(n.flags&128)!==0)e:for(n=s.child;n!==null;){if(n.tag===13)n.memoizedState!==null&&U0(n,o,s);else if(n.tag===19)U0(n,o,s);else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===s)break e;for(;n.sibling===null;){if(n.return===null||n.return===s)break e;n=n.return}n.sibling.return=n.return,n=n.sibling}u&=1}if($t(on,u),(s.mode&1)===0)s.memoizedState=null;else switch(m){case"forwards":for(o=s.child,m=null;o!==null;)n=o.alternate,n!==null&&Fc(n)===null&&(m=o),o=o.sibling;o=m,o===null?(m=s.child,s.child=null):(m=o.sibling,o.sibling=null),Lh(s,!1,m,o,y);break;case"backwards":for(o=null,m=s.child,s.child=null;m!==null;){if(n=m.alternate,n!==null&&Fc(n)===null){s.child=m;break}n=m.sibling,m.sibling=o,o=m,m=n}Lh(s,!0,o,null,y);break;case"together":Lh(s,!1,null,null,void 0);break;default:s.memoizedState=null}return s.child}function jc(n,s){(s.mode&1)===0&&n!==null&&(n.alternate=null,s.alternate=null,s.flags|=2)}function Pr(n,s,o){if(n!==null&&(s.dependencies=n.dependencies),Js|=s.lanes,(o&s.childLanes)===0)return null;if(n!==null&&s.child!==n.child)throw Error(t(153));if(s.child!==null){for(n=s.child,o=ms(n,n.pendingProps),s.child=o,o.return=s;n.sibling!==null;)n=n.sibling,o=o.sibling=ms(n,n.pendingProps),o.return=s;o.sibling=null}return s.child}function YS(n,s,o){switch(s.tag){case 3:L0(s),Ba();break;case 5:Yg(s);break;case 1:ii(s.type)&&Tc(s);break;case 4:dh(s,s.stateNode.containerInfo);break;case 10:var u=s.type._context,m=s.memoizedProps.value;$t(Lc,u._currentValue),u._currentValue=m;break;case 13:if(u=s.memoizedState,u!==null)return u.dehydrated!==null?($t(on,on.current&1),s.flags|=128,null):(o&s.child.childLanes)!==0?I0(n,s,o):($t(on,on.current&1),n=Pr(n,s,o),n!==null?n.sibling:null);$t(on,on.current&1);break;case 19:if(u=(o&s.childLanes)!==0,(n.flags&128)!==0){if(u)return F0(n,s,o);s.flags|=128}if(m=s.memoizedState,m!==null&&(m.rendering=null,m.tail=null,m.lastEffect=null),$t(on,on.current),u)break;return null;case 22:case 23:return s.lanes=0,A0(n,s,o)}return Pr(n,s,o)}var O0,Dh,k0,z0;O0=function(n,s){for(var o=s.child;o!==null;){if(o.tag===5||o.tag===6)n.appendChild(o.stateNode);else if(o.tag!==4&&o.child!==null){o.child.return=o,o=o.child;continue}if(o===s)break;for(;o.sibling===null;){if(o.return===null||o.return===s)return;o=o.return}o.sibling.return=o.return,o=o.sibling}},Dh=function(){},k0=function(n,s,o,u){var m=n.memoizedProps;if(m!==u){n=s.stateNode,Qs(nr.current);var y=null;switch(o){case"input":m=Dt(n,m),u=Dt(n,u),y=[];break;case"select":m=de({},m,{value:void 0}),u=de({},u,{value:void 0}),y=[];break;case"textarea":m=Jt(n,m),u=Jt(n,u),y=[];break;default:typeof m.onClick!="function"&&typeof u.onClick=="function"&&(n.onclick=Ec)}Ze(o,u);var R;o=null;for(me in m)if(!u.hasOwnProperty(me)&&m.hasOwnProperty(me)&&m[me]!=null)if(me==="style"){var B=m[me];for(R in B)B.hasOwnProperty(R)&&(o||(o={}),o[R]="")}else me!=="dangerouslySetInnerHTML"&&me!=="children"&&me!=="suppressContentEditableWarning"&&me!=="suppressHydrationWarning"&&me!=="autoFocus"&&(a.hasOwnProperty(me)?y||(y=[]):(y=y||[]).push(me,null));for(me in u){var W=u[me];if(B=m!=null?m[me]:void 0,u.hasOwnProperty(me)&&W!==B&&(W!=null||B!=null))if(me==="style")if(B){for(R in B)!B.hasOwnProperty(R)||W&&W.hasOwnProperty(R)||(o||(o={}),o[R]="");for(R in W)W.hasOwnProperty(R)&&B[R]!==W[R]&&(o||(o={}),o[R]=W[R])}else o||(y||(y=[]),y.push(me,o)),o=W;else me==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,B=B?B.__html:void 0,W!=null&&B!==W&&(y=y||[]).push(me,W)):me==="children"?typeof W!="string"&&typeof W!="number"||(y=y||[]).push(me,""+W):me!=="suppressContentEditableWarning"&&me!=="suppressHydrationWarning"&&(a.hasOwnProperty(me)?(W!=null&&me==="onScroll"&&Yt("scroll",n),y||B===W||(y=[])):(y=y||[]).push(me,W))}o&&(y=y||[]).push("style",o);var me=y;(s.updateQueue=me)&&(s.flags|=4)}},z0=function(n,s,o,u){o!==u&&(s.flags|=4)};function _l(n,s){if(!tn)switch(n.tailMode){case"hidden":s=n.tail;for(var o=null;s!==null;)s.alternate!==null&&(o=s),s=s.sibling;o===null?n.tail=null:o.sibling=null;break;case"collapsed":o=n.tail;for(var u=null;o!==null;)o.alternate!==null&&(u=o),o=o.sibling;u===null?s||n.tail===null?n.tail=null:n.tail.sibling=null:u.sibling=null}}function zn(n){var s=n.alternate!==null&&n.alternate.child===n.child,o=0,u=0;if(s)for(var m=n.child;m!==null;)o|=m.lanes|m.childLanes,u|=m.subtreeFlags&14680064,u|=m.flags&14680064,m.return=n,m=m.sibling;else for(m=n.child;m!==null;)o|=m.lanes|m.childLanes,u|=m.subtreeFlags,u|=m.flags,m.return=n,m=m.sibling;return n.subtreeFlags|=u,n.childLanes=o,s}function QS(n,s,o){var u=s.pendingProps;switch(th(s),s.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return zn(s),null;case 1:return ii(s.type)&&bc(),zn(s),null;case 3:return u=s.stateNode,ja(),Qt(ni),Qt(On),ph(),u.pendingContext&&(u.context=u.pendingContext,u.pendingContext=null),(n===null||n.child===null)&&(Pc(s)?s.flags|=4:n===null||n.memoizedState.isDehydrated&&(s.flags&256)===0||(s.flags|=1024,zi!==null&&(jh(zi),zi=null))),Dh(n,s),zn(s),null;case 5:hh(s);var m=Qs(pl.current);if(o=s.type,n!==null&&s.stateNode!=null)k0(n,s,o,u,m),n.ref!==s.ref&&(s.flags|=512,s.flags|=2097152);else{if(!u){if(s.stateNode===null)throw Error(t(166));return zn(s),null}if(n=Qs(nr.current),Pc(s)){u=s.stateNode,o=s.type;var y=s.memoizedProps;switch(u[tr]=s,u[cl]=y,n=(s.mode&1)!==0,o){case"dialog":Yt("cancel",u),Yt("close",u);break;case"iframe":case"object":case"embed":Yt("load",u);break;case"video":case"audio":for(m=0;m<al.length;m++)Yt(al[m],u);break;case"source":Yt("error",u);break;case"img":case"image":case"link":Yt("error",u),Yt("load",u);break;case"details":Yt("toggle",u);break;case"input":Ct(u,y),Yt("invalid",u);break;case"select":u._wrapperState={wasMultiple:!!y.multiple},Yt("invalid",u);break;case"textarea":Q(u,y),Yt("invalid",u)}Ze(o,y),m=null;for(var R in y)if(y.hasOwnProperty(R)){var B=y[R];R==="children"?typeof B=="string"?u.textContent!==B&&(y.suppressHydrationWarning!==!0&&Mc(u.textContent,B,n),m=["children",B]):typeof B=="number"&&u.textContent!==""+B&&(y.suppressHydrationWarning!==!0&&Mc(u.textContent,B,n),m=["children",""+B]):a.hasOwnProperty(R)&&B!=null&&R==="onScroll"&&Yt("scroll",u)}switch(o){case"input":qe(u),un(u,y,!0);break;case"textarea":qe(u),Nt(u);break;case"select":case"option":break;default:typeof y.onClick=="function"&&(u.onclick=Ec)}u=m,s.updateQueue=u,u!==null&&(s.flags|=4)}else{R=m.nodeType===9?m:m.ownerDocument,n==="http://www.w3.org/1999/xhtml"&&(n=O(o)),n==="http://www.w3.org/1999/xhtml"?o==="script"?(n=R.createElement("div"),n.innerHTML="<script><\/script>",n=n.removeChild(n.firstChild)):typeof u.is=="string"?n=R.createElement(o,{is:u.is}):(n=R.createElement(o),o==="select"&&(R=n,u.multiple?R.multiple=!0:u.size&&(R.size=u.size))):n=R.createElementNS(n,o),n[tr]=s,n[cl]=u,O0(n,s,!1,!1),s.stateNode=n;e:{switch(R=Fe(o,u),o){case"dialog":Yt("cancel",n),Yt("close",n),m=u;break;case"iframe":case"object":case"embed":Yt("load",n),m=u;break;case"video":case"audio":for(m=0;m<al.length;m++)Yt(al[m],n);m=u;break;case"source":Yt("error",n),m=u;break;case"img":case"image":case"link":Yt("error",n),Yt("load",n),m=u;break;case"details":Yt("toggle",n),m=u;break;case"input":Ct(n,u),m=Dt(n,u),Yt("invalid",n);break;case"option":m=u;break;case"select":n._wrapperState={wasMultiple:!!u.multiple},m=de({},u,{value:void 0}),Yt("invalid",n);break;case"textarea":Q(n,u),m=Jt(n,u),Yt("invalid",n);break;default:m=u}Ze(o,m),B=m;for(y in B)if(B.hasOwnProperty(y)){var W=B[y];y==="style"?ye(n,W):y==="dangerouslySetInnerHTML"?(W=W?W.__html:void 0,W!=null&&he(n,W)):y==="children"?typeof W=="string"?(o!=="textarea"||W!=="")&&ge(n,W):typeof W=="number"&&ge(n,""+W):y!=="suppressContentEditableWarning"&&y!=="suppressHydrationWarning"&&y!=="autoFocus"&&(a.hasOwnProperty(y)?W!=null&&y==="onScroll"&&Yt("scroll",n):W!=null&&L(n,y,W,R))}switch(o){case"input":qe(n),un(n,u,!1);break;case"textarea":qe(n),Nt(n);break;case"option":u.value!=null&&n.setAttribute("value",""+fe(u.value));break;case"select":n.multiple=!!u.multiple,y=u.value,y!=null?Ot(n,!!u.multiple,y,!1):u.defaultValue!=null&&Ot(n,!!u.multiple,u.defaultValue,!0);break;default:typeof m.onClick=="function"&&(n.onclick=Ec)}switch(o){case"button":case"input":case"select":case"textarea":u=!!u.autoFocus;break e;case"img":u=!0;break e;default:u=!1}}u&&(s.flags|=4)}s.ref!==null&&(s.flags|=512,s.flags|=2097152)}return zn(s),null;case 6:if(n&&s.stateNode!=null)z0(n,s,n.memoizedProps,u);else{if(typeof u!="string"&&s.stateNode===null)throw Error(t(166));if(o=Qs(pl.current),Qs(nr.current),Pc(s)){if(u=s.stateNode,o=s.memoizedProps,u[tr]=s,(y=u.nodeValue!==o)&&(n=pi,n!==null))switch(n.tag){case 3:Mc(u.nodeValue,o,(n.mode&1)!==0);break;case 5:n.memoizedProps.suppressHydrationWarning!==!0&&Mc(u.nodeValue,o,(n.mode&1)!==0)}y&&(s.flags|=4)}else u=(o.nodeType===9?o:o.ownerDocument).createTextNode(u),u[tr]=s,s.stateNode=u}return zn(s),null;case 13:if(Qt(on),u=s.memoizedState,n===null||n.memoizedState!==null&&n.memoizedState.dehydrated!==null){if(tn&&mi!==null&&(s.mode&1)!==0&&(s.flags&128)===0)Vg(),Ba(),s.flags|=98560,y=!1;else if(y=Pc(s),u!==null&&u.dehydrated!==null){if(n===null){if(!y)throw Error(t(318));if(y=s.memoizedState,y=y!==null?y.dehydrated:null,!y)throw Error(t(317));y[tr]=s}else Ba(),(s.flags&128)===0&&(s.memoizedState=null),s.flags|=4;zn(s),y=!1}else zi!==null&&(jh(zi),zi=null),y=!0;if(!y)return s.flags&65536?s:null}return(s.flags&128)!==0?(s.lanes=o,s):(u=u!==null,u!==(n!==null&&n.memoizedState!==null)&&u&&(s.child.flags|=8192,(s.mode&1)!==0&&(n===null||(on.current&1)!==0?_n===0&&(_n=3):$h())),s.updateQueue!==null&&(s.flags|=4),zn(s),null);case 4:return ja(),Dh(n,s),n===null&&ol(s.stateNode.containerInfo),zn(s),null;case 10:return oh(s.type._context),zn(s),null;case 17:return ii(s.type)&&bc(),zn(s),null;case 19:if(Qt(on),y=s.memoizedState,y===null)return zn(s),null;if(u=(s.flags&128)!==0,R=y.rendering,R===null)if(u)_l(y,!1);else{if(_n!==0||n!==null&&(n.flags&128)!==0)for(n=s.child;n!==null;){if(R=Fc(n),R!==null){for(s.flags|=128,_l(y,!1),u=R.updateQueue,u!==null&&(s.updateQueue=u,s.flags|=4),s.subtreeFlags=0,u=o,o=s.child;o!==null;)y=o,n=u,y.flags&=14680066,R=y.alternate,R===null?(y.childLanes=0,y.lanes=n,y.child=null,y.subtreeFlags=0,y.memoizedProps=null,y.memoizedState=null,y.updateQueue=null,y.dependencies=null,y.stateNode=null):(y.childLanes=R.childLanes,y.lanes=R.lanes,y.child=R.child,y.subtreeFlags=0,y.deletions=null,y.memoizedProps=R.memoizedProps,y.memoizedState=R.memoizedState,y.updateQueue=R.updateQueue,y.type=R.type,n=R.dependencies,y.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext}),o=o.sibling;return $t(on,on.current&1|2),s.child}n=n.sibling}y.tail!==null&&an()>qa&&(s.flags|=128,u=!0,_l(y,!1),s.lanes=4194304)}else{if(!u)if(n=Fc(R),n!==null){if(s.flags|=128,u=!0,o=n.updateQueue,o!==null&&(s.updateQueue=o,s.flags|=4),_l(y,!0),y.tail===null&&y.tailMode==="hidden"&&!R.alternate&&!tn)return zn(s),null}else 2*an()-y.renderingStartTime>qa&&o!==1073741824&&(s.flags|=128,u=!0,_l(y,!1),s.lanes=4194304);y.isBackwards?(R.sibling=s.child,s.child=R):(o=y.last,o!==null?o.sibling=R:s.child=R,y.last=R)}return y.tail!==null?(s=y.tail,y.rendering=s,y.tail=s.sibling,y.renderingStartTime=an(),s.sibling=null,o=on.current,$t(on,u?o&1|2:o&1),s):(zn(s),null);case 22:case 23:return Xh(),u=s.memoizedState!==null,n!==null&&n.memoizedState!==null!==u&&(s.flags|=8192),u&&(s.mode&1)!==0?(gi&1073741824)!==0&&(zn(s),s.subtreeFlags&6&&(s.flags|=8192)):zn(s),null;case 24:return null;case 25:return null}throw Error(t(156,s.tag))}function ZS(n,s){switch(th(s),s.tag){case 1:return ii(s.type)&&bc(),n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 3:return ja(),Qt(ni),Qt(On),ph(),n=s.flags,(n&65536)!==0&&(n&128)===0?(s.flags=n&-65537|128,s):null;case 5:return hh(s),null;case 13:if(Qt(on),n=s.memoizedState,n!==null&&n.dehydrated!==null){if(s.alternate===null)throw Error(t(340));Ba()}return n=s.flags,n&65536?(s.flags=n&-65537|128,s):null;case 19:return Qt(on),null;case 4:return ja(),null;case 10:return oh(s.type._context),null;case 22:case 23:return Xh(),null;case 24:return null;default:return null}}var Wc=!1,Bn=!1,JS=typeof WeakSet=="function"?WeakSet:Set,We=null;function Xa(n,s){var o=n.ref;if(o!==null)if(typeof o=="function")try{o(null)}catch(u){hn(n,s,u)}else o.current=null}function Ih(n,s,o){try{o()}catch(u){hn(n,s,u)}}var B0=!1;function eM(n,s){if(Xd=dc,n=vg(),kd(n)){if("selectionStart"in n)var o={start:n.selectionStart,end:n.selectionEnd};else e:{o=(o=n.ownerDocument)&&o.defaultView||window;var u=o.getSelection&&o.getSelection();if(u&&u.rangeCount!==0){o=u.anchorNode;var m=u.anchorOffset,y=u.focusNode;u=u.focusOffset;try{o.nodeType,y.nodeType}catch{o=null;break e}var R=0,B=-1,W=-1,me=0,Ee=0,we=n,Me=null;t:for(;;){for(var He;we!==o||m!==0&&we.nodeType!==3||(B=R+m),we!==y||u!==0&&we.nodeType!==3||(W=R+u),we.nodeType===3&&(R+=we.nodeValue.length),(He=we.firstChild)!==null;)Me=we,we=He;for(;;){if(we===n)break t;if(Me===o&&++me===m&&(B=R),Me===y&&++Ee===u&&(W=R),(He=we.nextSibling)!==null)break;we=Me,Me=we.parentNode}we=He}o=B===-1||W===-1?null:{start:B,end:W}}else o=null}o=o||{start:0,end:0}}else o=null;for($d={focusedElem:n,selectionRange:o},dc=!1,We=s;We!==null;)if(s=We,n=s.child,(s.subtreeFlags&1028)!==0&&n!==null)n.return=s,We=n;else for(;We!==null;){s=We;try{var $e=s.alternate;if((s.flags&1024)!==0)switch(s.tag){case 0:case 11:case 15:break;case 1:if($e!==null){var Qe=$e.memoizedProps,pn=$e.memoizedState,se=s.stateNode,Y=se.getSnapshotBeforeUpdate(s.elementType===s.type?Qe:Bi(s.type,Qe),pn);se.__reactInternalSnapshotBeforeUpdate=Y}break;case 3:var ce=s.stateNode.containerInfo;ce.nodeType===1?ce.textContent="":ce.nodeType===9&&ce.documentElement&&ce.removeChild(ce.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(t(163))}}catch(Te){hn(s,s.return,Te)}if(n=s.sibling,n!==null){n.return=s.return,We=n;break}We=s.return}return $e=B0,B0=!1,$e}function yl(n,s,o){var u=s.updateQueue;if(u=u!==null?u.lastEffect:null,u!==null){var m=u=u.next;do{if((m.tag&n)===n){var y=m.destroy;m.destroy=void 0,y!==void 0&&Ih(s,o,y)}m=m.next}while(m!==u)}}function Xc(n,s){if(s=s.updateQueue,s=s!==null?s.lastEffect:null,s!==null){var o=s=s.next;do{if((o.tag&n)===n){var u=o.create;o.destroy=u()}o=o.next}while(o!==s)}}function Uh(n){var s=n.ref;if(s!==null){var o=n.stateNode;switch(n.tag){case 5:n=o;break;default:n=o}typeof s=="function"?s(n):s.current=n}}function H0(n){var s=n.alternate;s!==null&&(n.alternate=null,H0(s)),n.child=null,n.deletions=null,n.sibling=null,n.tag===5&&(s=n.stateNode,s!==null&&(delete s[tr],delete s[cl],delete s[Qd],delete s[FS],delete s[OS])),n.stateNode=null,n.return=null,n.dependencies=null,n.memoizedProps=null,n.memoizedState=null,n.pendingProps=null,n.stateNode=null,n.updateQueue=null}function V0(n){return n.tag===5||n.tag===3||n.tag===4}function G0(n){e:for(;;){for(;n.sibling===null;){if(n.return===null||V0(n.return))return null;n=n.return}for(n.sibling.return=n.return,n=n.sibling;n.tag!==5&&n.tag!==6&&n.tag!==18;){if(n.flags&2||n.child===null||n.tag===4)continue e;n.child.return=n,n=n.child}if(!(n.flags&2))return n.stateNode}}function Fh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.nodeType===8?o.parentNode.insertBefore(n,s):o.insertBefore(n,s):(o.nodeType===8?(s=o.parentNode,s.insertBefore(n,o)):(s=o,s.appendChild(n)),o=o._reactRootContainer,o!=null||s.onclick!==null||(s.onclick=Ec));else if(u!==4&&(n=n.child,n!==null))for(Fh(n,s,o),n=n.sibling;n!==null;)Fh(n,s,o),n=n.sibling}function Oh(n,s,o){var u=n.tag;if(u===5||u===6)n=n.stateNode,s?o.insertBefore(n,s):o.appendChild(n);else if(u!==4&&(n=n.child,n!==null))for(Oh(n,s,o),n=n.sibling;n!==null;)Oh(n,s,o),n=n.sibling}var Ln=null,Hi=!1;function us(n,s,o){for(o=o.child;o!==null;)j0(n,s,o),o=o.sibling}function j0(n,s,o){if(Ae&&typeof Ae.onCommitFiberUnmount=="function")try{Ae.onCommitFiberUnmount(ae,o)}catch{}switch(o.tag){case 5:Bn||Xa(o,s);case 6:var u=Ln,m=Hi;Ln=null,us(n,s,o),Ln=u,Hi=m,Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?n.parentNode.removeChild(o):n.removeChild(o)):Ln.removeChild(o.stateNode));break;case 18:Ln!==null&&(Hi?(n=Ln,o=o.stateNode,n.nodeType===8?Yd(n.parentNode,o):n.nodeType===1&&Yd(n,o),Zo(n)):Yd(Ln,o.stateNode));break;case 4:u=Ln,m=Hi,Ln=o.stateNode.containerInfo,Hi=!0,us(n,s,o),Ln=u,Hi=m;break;case 0:case 11:case 14:case 15:if(!Bn&&(u=o.updateQueue,u!==null&&(u=u.lastEffect,u!==null))){m=u=u.next;do{var y=m,R=y.destroy;y=y.tag,R!==void 0&&((y&2)!==0||(y&4)!==0)&&Ih(o,s,R),m=m.next}while(m!==u)}us(n,s,o);break;case 1:if(!Bn&&(Xa(o,s),u=o.stateNode,typeof u.componentWillUnmount=="function"))try{u.props=o.memoizedProps,u.state=o.memoizedState,u.componentWillUnmount()}catch(B){hn(o,s,B)}us(n,s,o);break;case 21:us(n,s,o);break;case 22:o.mode&1?(Bn=(u=Bn)||o.memoizedState!==null,us(n,s,o),Bn=u):us(n,s,o);break;default:us(n,s,o)}}function W0(n){var s=n.updateQueue;if(s!==null){n.updateQueue=null;var o=n.stateNode;o===null&&(o=n.stateNode=new JS),s.forEach(function(u){var m=cM.bind(null,n,u);o.has(u)||(o.add(u),u.then(m,m))})}}function Vi(n,s){var o=s.deletions;if(o!==null)for(var u=0;u<o.length;u++){var m=o[u];try{var y=n,R=s,B=R;e:for(;B!==null;){switch(B.tag){case 5:Ln=B.stateNode,Hi=!1;break e;case 3:Ln=B.stateNode.containerInfo,Hi=!0;break e;case 4:Ln=B.stateNode.containerInfo,Hi=!0;break e}B=B.return}if(Ln===null)throw Error(t(160));j0(y,R,m),Ln=null,Hi=!1;var W=m.alternate;W!==null&&(W.return=null),m.return=null}catch(me){hn(m,s,me)}}if(s.subtreeFlags&12854)for(s=s.child;s!==null;)X0(s,n),s=s.sibling}function X0(n,s){var o=n.alternate,u=n.flags;switch(n.tag){case 0:case 11:case 14:case 15:if(Vi(s,n),rr(n),u&4){try{yl(3,n,n.return),Xc(3,n)}catch(Qe){hn(n,n.return,Qe)}try{yl(5,n,n.return)}catch(Qe){hn(n,n.return,Qe)}}break;case 1:Vi(s,n),rr(n),u&512&&o!==null&&Xa(o,o.return);break;case 5:if(Vi(s,n),rr(n),u&512&&o!==null&&Xa(o,o.return),n.flags&32){var m=n.stateNode;try{ge(m,"")}catch(Qe){hn(n,n.return,Qe)}}if(u&4&&(m=n.stateNode,m!=null)){var y=n.memoizedProps,R=o!==null?o.memoizedProps:y,B=n.type,W=n.updateQueue;if(n.updateQueue=null,W!==null)try{B==="input"&&y.type==="radio"&&y.name!=null&&Et(m,y),Fe(B,R);var me=Fe(B,y);for(R=0;R<W.length;R+=2){var Ee=W[R],we=W[R+1];Ee==="style"?ye(m,we):Ee==="dangerouslySetInnerHTML"?he(m,we):Ee==="children"?ge(m,we):L(m,Ee,we,me)}switch(B){case"input":Zt(m,y);break;case"textarea":Pn(m,y);break;case"select":var Me=m._wrapperState.wasMultiple;m._wrapperState.wasMultiple=!!y.multiple;var He=y.value;He!=null?Ot(m,!!y.multiple,He,!1):Me!==!!y.multiple&&(y.defaultValue!=null?Ot(m,!!y.multiple,y.defaultValue,!0):Ot(m,!!y.multiple,y.multiple?[]:"",!1))}m[cl]=y}catch(Qe){hn(n,n.return,Qe)}}break;case 6:if(Vi(s,n),rr(n),u&4){if(n.stateNode===null)throw Error(t(162));m=n.stateNode,y=n.memoizedProps;try{m.nodeValue=y}catch(Qe){hn(n,n.return,Qe)}}break;case 3:if(Vi(s,n),rr(n),u&4&&o!==null&&o.memoizedState.isDehydrated)try{Zo(s.containerInfo)}catch(Qe){hn(n,n.return,Qe)}break;case 4:Vi(s,n),rr(n);break;case 13:Vi(s,n),rr(n),m=n.child,m.flags&8192&&(y=m.memoizedState!==null,m.stateNode.isHidden=y,!y||m.alternate!==null&&m.alternate.memoizedState!==null||(Bh=an())),u&4&&W0(n);break;case 22:if(Ee=o!==null&&o.memoizedState!==null,n.mode&1?(Bn=(me=Bn)||Ee,Vi(s,n),Bn=me):Vi(s,n),rr(n),u&8192){if(me=n.memoizedState!==null,(n.stateNode.isHidden=me)&&!Ee&&(n.mode&1)!==0)for(We=n,Ee=n.child;Ee!==null;){for(we=We=Ee;We!==null;){switch(Me=We,He=Me.child,Me.tag){case 0:case 11:case 14:case 15:yl(4,Me,Me.return);break;case 1:Xa(Me,Me.return);var $e=Me.stateNode;if(typeof $e.componentWillUnmount=="function"){u=Me,o=Me.return;try{s=u,$e.props=s.memoizedProps,$e.state=s.memoizedState,$e.componentWillUnmount()}catch(Qe){hn(u,o,Qe)}}break;case 5:Xa(Me,Me.return);break;case 22:if(Me.memoizedState!==null){K0(we);continue}}He!==null?(He.return=Me,We=He):K0(we)}Ee=Ee.sibling}e:for(Ee=null,we=n;;){if(we.tag===5){if(Ee===null){Ee=we;try{m=we.stateNode,me?(y=m.style,typeof y.setProperty=="function"?y.setProperty("display","none","important"):y.display="none"):(B=we.stateNode,W=we.memoizedProps.style,R=W!=null&&W.hasOwnProperty("display")?W.display:null,B.style.display=ve("display",R))}catch(Qe){hn(n,n.return,Qe)}}}else if(we.tag===6){if(Ee===null)try{we.stateNode.nodeValue=me?"":we.memoizedProps}catch(Qe){hn(n,n.return,Qe)}}else if((we.tag!==22&&we.tag!==23||we.memoizedState===null||we===n)&&we.child!==null){we.child.return=we,we=we.child;continue}if(we===n)break e;for(;we.sibling===null;){if(we.return===null||we.return===n)break e;Ee===we&&(Ee=null),we=we.return}Ee===we&&(Ee=null),we.sibling.return=we.return,we=we.sibling}}break;case 19:Vi(s,n),rr(n),u&4&&W0(n);break;case 21:break;default:Vi(s,n),rr(n)}}function rr(n){var s=n.flags;if(s&2){try{e:{for(var o=n.return;o!==null;){if(V0(o)){var u=o;break e}o=o.return}throw Error(t(160))}switch(u.tag){case 5:var m=u.stateNode;u.flags&32&&(ge(m,""),u.flags&=-33);var y=G0(n);Oh(n,y,m);break;case 3:case 4:var R=u.stateNode.containerInfo,B=G0(n);Fh(n,B,R);break;default:throw Error(t(161))}}catch(W){hn(n,n.return,W)}n.flags&=-3}s&4096&&(n.flags&=-4097)}function tM(n,s,o){We=n,$0(n)}function $0(n,s,o){for(var u=(n.mode&1)!==0;We!==null;){var m=We,y=m.child;if(m.tag===22&&u){var R=m.memoizedState!==null||Wc;if(!R){var B=m.alternate,W=B!==null&&B.memoizedState!==null||Bn;B=Wc;var me=Bn;if(Wc=R,(Bn=W)&&!me)for(We=m;We!==null;)R=We,W=R.child,R.tag===22&&R.memoizedState!==null?Y0(m):W!==null?(W.return=R,We=W):Y0(m);for(;y!==null;)We=y,$0(y),y=y.sibling;We=m,Wc=B,Bn=me}q0(n)}else(m.subtreeFlags&8772)!==0&&y!==null?(y.return=m,We=y):q0(n)}}function q0(n){for(;We!==null;){var s=We;if((s.flags&8772)!==0){var o=s.alternate;try{if((s.flags&8772)!==0)switch(s.tag){case 0:case 11:case 15:Bn||Xc(5,s);break;case 1:var u=s.stateNode;if(s.flags&4&&!Bn)if(o===null)u.componentDidMount();else{var m=s.elementType===s.type?o.memoizedProps:Bi(s.type,o.memoizedProps);u.componentDidUpdate(m,o.memoizedState,u.__reactInternalSnapshotBeforeUpdate)}var y=s.updateQueue;y!==null&&Kg(s,y,u);break;case 3:var R=s.updateQueue;if(R!==null){if(o=null,s.child!==null)switch(s.child.tag){case 5:o=s.child.stateNode;break;case 1:o=s.child.stateNode}Kg(s,R,o)}break;case 5:var B=s.stateNode;if(o===null&&s.flags&4){o=B;var W=s.memoizedProps;switch(s.type){case"button":case"input":case"select":case"textarea":W.autoFocus&&o.focus();break;case"img":W.src&&(o.src=W.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(s.memoizedState===null){var me=s.alternate;if(me!==null){var Ee=me.memoizedState;if(Ee!==null){var we=Ee.dehydrated;we!==null&&Zo(we)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(t(163))}Bn||s.flags&512&&Uh(s)}catch(Me){hn(s,s.return,Me)}}if(s===n){We=null;break}if(o=s.sibling,o!==null){o.return=s.return,We=o;break}We=s.return}}function K0(n){for(;We!==null;){var s=We;if(s===n){We=null;break}var o=s.sibling;if(o!==null){o.return=s.return,We=o;break}We=s.return}}function Y0(n){for(;We!==null;){var s=We;try{switch(s.tag){case 0:case 11:case 15:var o=s.return;try{Xc(4,s)}catch(W){hn(s,o,W)}break;case 1:var u=s.stateNode;if(typeof u.componentDidMount=="function"){var m=s.return;try{u.componentDidMount()}catch(W){hn(s,m,W)}}var y=s.return;try{Uh(s)}catch(W){hn(s,y,W)}break;case 5:var R=s.return;try{Uh(s)}catch(W){hn(s,R,W)}}}catch(W){hn(s,s.return,W)}if(s===n){We=null;break}var B=s.sibling;if(B!==null){B.return=s.return,We=B;break}We=s.return}}var nM=Math.ceil,$c=C.ReactCurrentDispatcher,kh=C.ReactCurrentOwner,Ai=C.ReactCurrentBatchConfig,At=0,Tn=null,gn=null,Dn=0,gi=0,$a=ss(0),_n=0,Sl=null,Js=0,qc=0,zh=0,Ml=null,si=null,Bh=0,qa=1/0,Nr=null,Kc=!1,Hh=null,ds=null,Yc=!1,hs=null,Qc=0,El=0,Vh=null,Zc=-1,Jc=0;function qn(){return(At&6)!==0?an():Zc!==-1?Zc:Zc=an()}function fs(n){return(n.mode&1)===0?1:(At&2)!==0&&Dn!==0?Dn&-Dn:zS.transition!==null?(Jc===0&&(Jc=Be()),Jc):(n=yt,n!==0||(n=window.event,n=n===void 0?16:Zm(n.type)),n)}function Gi(n,s,o,u){if(50<El)throw El=0,Vh=null,Error(t(185));vt(n,o,u),((At&2)===0||n!==Tn)&&(n===Tn&&((At&2)===0&&(qc|=o),_n===4&&ps(n,Dn)),ai(n,u),o===1&&At===0&&(s.mode&1)===0&&(qa=an()+500,Cc&&os()))}function ai(n,s){var o=n.callbackNode;kt(n,s);var u=Xt(n,n===Tn?Dn:0);if(u===0)o!==null&&Xo(o),n.callbackNode=null,n.callbackPriority=0;else if(s=u&-u,n.callbackPriority!==s){if(o!=null&&Xo(o),s===1)n.tag===0?kS(Z0.bind(null,n)):Og(Z0.bind(null,n)),IS(function(){(At&6)===0&&os()}),o=null;else{switch(Er(u)){case 1:o=$o;break;case 4:o=A;break;case 16:o=Z;break;case 536870912:o=oe;break;default:o=Z}o=ax(o,Q0.bind(null,n))}n.callbackPriority=s,n.callbackNode=o}}function Q0(n,s){if(Zc=-1,Jc=0,(At&6)!==0)throw Error(t(327));var o=n.callbackNode;if(Ka()&&n.callbackNode!==o)return null;var u=Xt(n,n===Tn?Dn:0);if(u===0)return null;if((u&30)!==0||(u&n.expiredLanes)!==0||s)s=eu(n,u);else{s=u;var m=At;At|=2;var y=ex();(Tn!==n||Dn!==s)&&(Nr=null,qa=an()+500,ta(n,s));do try{sM();break}catch(B){J0(n,B)}while(!0);ah(),$c.current=y,At=m,gn!==null?s=0:(Tn=null,Dn=0,s=_n)}if(s!==0){if(s===2&&(m=mn(n),m!==0&&(u=m,s=Gh(n,m))),s===1)throw o=Sl,ta(n,0),ps(n,u),ai(n,an()),o;if(s===6)ps(n,u);else{if(m=n.current.alternate,(u&30)===0&&!iM(m)&&(s=eu(n,u),s===2&&(y=mn(n),y!==0&&(u=y,s=Gh(n,y))),s===1))throw o=Sl,ta(n,0),ps(n,u),ai(n,an()),o;switch(n.finishedWork=m,n.finishedLanes=u,s){case 0:case 1:throw Error(t(345));case 2:na(n,si,Nr);break;case 3:if(ps(n,u),(u&130023424)===u&&(s=Bh+500-an(),10<s)){if(Xt(n,0)!==0)break;if(m=n.suspendedLanes,(m&u)!==u){qn(),n.pingedLanes|=n.suspendedLanes&m;break}n.timeoutHandle=Kd(na.bind(null,n,si,Nr),s);break}na(n,si,Nr);break;case 4:if(ps(n,u),(u&4194240)===u)break;for(s=n.eventTimes,m=-1;0<u;){var R=31-Re(u);y=1<<R,R=s[R],R>m&&(m=R),u&=~y}if(u=m,u=an()-u,u=(120>u?120:480>u?480:1080>u?1080:1920>u?1920:3e3>u?3e3:4320>u?4320:1960*nM(u/1960))-u,10<u){n.timeoutHandle=Kd(na.bind(null,n,si,Nr),u);break}na(n,si,Nr);break;case 5:na(n,si,Nr);break;default:throw Error(t(329))}}}return ai(n,an()),n.callbackNode===o?Q0.bind(null,n):null}function Gh(n,s){var o=Ml;return n.current.memoizedState.isDehydrated&&(ta(n,s).flags|=256),n=eu(n,s),n!==2&&(s=si,si=o,s!==null&&jh(s)),n}function jh(n){si===null?si=n:si.push.apply(si,n)}function iM(n){for(var s=n;;){if(s.flags&16384){var o=s.updateQueue;if(o!==null&&(o=o.stores,o!==null))for(var u=0;u<o.length;u++){var m=o[u],y=m.getSnapshot;m=m.value;try{if(!ki(y(),m))return!1}catch{return!1}}}if(o=s.child,s.subtreeFlags&16384&&o!==null)o.return=s,s=o;else{if(s===n)break;for(;s.sibling===null;){if(s.return===null||s.return===n)return!0;s=s.return}s.sibling.return=s.return,s=s.sibling}}return!0}function ps(n,s){for(s&=~zh,s&=~qc,n.suspendedLanes|=s,n.pingedLanes&=~s,n=n.expirationTimes;0<s;){var o=31-Re(s),u=1<<o;n[o]=-1,s&=~u}}function Z0(n){if((At&6)!==0)throw Error(t(327));Ka();var s=Xt(n,0);if((s&1)===0)return ai(n,an()),null;var o=eu(n,s);if(n.tag!==0&&o===2){var u=mn(n);u!==0&&(s=u,o=Gh(n,u))}if(o===1)throw o=Sl,ta(n,0),ps(n,s),ai(n,an()),o;if(o===6)throw Error(t(345));return n.finishedWork=n.current.alternate,n.finishedLanes=s,na(n,si,Nr),ai(n,an()),null}function Wh(n,s){var o=At;At|=1;try{return n(s)}finally{At=o,At===0&&(qa=an()+500,Cc&&os())}}function ea(n){hs!==null&&hs.tag===0&&(At&6)===0&&Ka();var s=At;At|=1;var o=Ai.transition,u=yt;try{if(Ai.transition=null,yt=1,n)return n()}finally{yt=u,Ai.transition=o,At=s,(At&6)===0&&os()}}function Xh(){gi=$a.current,Qt($a)}function ta(n,s){n.finishedWork=null,n.finishedLanes=0;var o=n.timeoutHandle;if(o!==-1&&(n.timeoutHandle=-1,DS(o)),gn!==null)for(o=gn.return;o!==null;){var u=o;switch(th(u),u.tag){case 1:u=u.type.childContextTypes,u!=null&&bc();break;case 3:ja(),Qt(ni),Qt(On),ph();break;case 5:hh(u);break;case 4:ja();break;case 13:Qt(on);break;case 19:Qt(on);break;case 10:oh(u.type._context);break;case 22:case 23:Xh()}o=o.return}if(Tn=n,gn=n=ms(n.current,null),Dn=gi=s,_n=0,Sl=null,zh=qc=Js=0,si=Ml=null,Ys!==null){for(s=0;s<Ys.length;s++)if(o=Ys[s],u=o.interleaved,u!==null){o.interleaved=null;var m=u.next,y=o.pending;if(y!==null){var R=y.next;y.next=m,u.next=R}o.pending=u}Ys=null}return n}function J0(n,s){do{var o=gn;try{if(ah(),Oc.current=Hc,kc){for(var u=ln.memoizedState;u!==null;){var m=u.queue;m!==null&&(m.pending=null),u=u.next}kc=!1}if(Zs=0,bn=vn=ln=null,ml=!1,gl=0,kh.current=null,o===null||o.return===null){_n=1,Sl=s,gn=null;break}e:{var y=n,R=o.return,B=o,W=s;if(s=Dn,B.flags|=32768,W!==null&&typeof W=="object"&&typeof W.then=="function"){var me=W,Ee=B,we=Ee.tag;if((Ee.mode&1)===0&&(we===0||we===11||we===15)){var Me=Ee.alternate;Me?(Ee.updateQueue=Me.updateQueue,Ee.memoizedState=Me.memoizedState,Ee.lanes=Me.lanes):(Ee.updateQueue=null,Ee.memoizedState=null)}var He=w0(R);if(He!==null){He.flags&=-257,b0(He,R,B,y,s),He.mode&1&&E0(y,me,s),s=He,W=me;var $e=s.updateQueue;if($e===null){var Qe=new Set;Qe.add(W),s.updateQueue=Qe}else $e.add(W);break e}else{if((s&1)===0){E0(y,me,s),$h();break e}W=Error(t(426))}}else if(tn&&B.mode&1){var pn=w0(R);if(pn!==null){(pn.flags&65536)===0&&(pn.flags|=256),b0(pn,R,B,y,s),rh(Wa(W,B));break e}}y=W=Wa(W,B),_n!==4&&(_n=2),Ml===null?Ml=[y]:Ml.push(y),y=R;do{switch(y.tag){case 3:y.flags|=65536,s&=-s,y.lanes|=s;var se=S0(y,W,s);qg(y,se);break e;case 1:B=W;var Y=y.type,ce=y.stateNode;if((y.flags&128)===0&&(typeof Y.getDerivedStateFromError=="function"||ce!==null&&typeof ce.componentDidCatch=="function"&&(ds===null||!ds.has(ce)))){y.flags|=65536,s&=-s,y.lanes|=s;var Te=M0(y,B,s);qg(y,Te);break e}}y=y.return}while(y!==null)}nx(o)}catch(et){s=et,gn===o&&o!==null&&(gn=o=o.return);continue}break}while(!0)}function ex(){var n=$c.current;return $c.current=Hc,n===null?Hc:n}function $h(){(_n===0||_n===3||_n===2)&&(_n=4),Tn===null||(Js&268435455)===0&&(qc&268435455)===0||ps(Tn,Dn)}function eu(n,s){var o=At;At|=2;var u=ex();(Tn!==n||Dn!==s)&&(Nr=null,ta(n,s));do try{rM();break}catch(m){J0(n,m)}while(!0);if(ah(),At=o,$c.current=u,gn!==null)throw Error(t(261));return Tn=null,Dn=0,_n}function rM(){for(;gn!==null;)tx(gn)}function sM(){for(;gn!==null&&!cc();)tx(gn)}function tx(n){var s=sx(n.alternate,n,gi);n.memoizedProps=n.pendingProps,s===null?nx(n):gn=s,kh.current=null}function nx(n){var s=n;do{var o=s.alternate;if(n=s.return,(s.flags&32768)===0){if(o=QS(o,s,gi),o!==null){gn=o;return}}else{if(o=ZS(o,s),o!==null){o.flags&=32767,gn=o;return}if(n!==null)n.flags|=32768,n.subtreeFlags=0,n.deletions=null;else{_n=6,gn=null;return}}if(s=s.sibling,s!==null){gn=s;return}gn=s=n}while(s!==null);_n===0&&(_n=5)}function na(n,s,o){var u=yt,m=Ai.transition;try{Ai.transition=null,yt=1,aM(n,s,o,u)}finally{Ai.transition=m,yt=u}return null}function aM(n,s,o,u){do Ka();while(hs!==null);if((At&6)!==0)throw Error(t(327));o=n.finishedWork;var m=n.finishedLanes;if(o===null)return null;if(n.finishedWork=null,n.finishedLanes=0,o===n.current)throw Error(t(177));n.callbackNode=null,n.callbackPriority=0;var y=o.lanes|o.childLanes;if(ei(n,y),n===Tn&&(gn=Tn=null,Dn=0),(o.subtreeFlags&2064)===0&&(o.flags&2064)===0||Yc||(Yc=!0,ax(Z,function(){return Ka(),null})),y=(o.flags&15990)!==0,(o.subtreeFlags&15990)!==0||y){y=Ai.transition,Ai.transition=null;var R=yt;yt=1;var B=At;At|=4,kh.current=null,eM(n,o),X0(o,n),TS($d),dc=!!Xd,$d=Xd=null,n.current=o,tM(o),bd(),At=B,yt=R,Ai.transition=y}else n.current=o;if(Yc&&(Yc=!1,hs=n,Qc=m),y=n.pendingLanes,y===0&&(ds=null),je(o.stateNode),ai(n,an()),s!==null)for(u=n.onRecoverableError,o=0;o<s.length;o++)m=s[o],u(m.value,{componentStack:m.stack,digest:m.digest});if(Kc)throw Kc=!1,n=Hh,Hh=null,n;return(Qc&1)!==0&&n.tag!==0&&Ka(),y=n.pendingLanes,(y&1)!==0?n===Vh?El++:(El=0,Vh=n):El=0,os(),null}function Ka(){if(hs!==null){var n=Er(Qc),s=Ai.transition,o=yt;try{if(Ai.transition=null,yt=16>n?16:n,hs===null)var u=!1;else{if(n=hs,hs=null,Qc=0,(At&6)!==0)throw Error(t(331));var m=At;for(At|=4,We=n.current;We!==null;){var y=We,R=y.child;if((We.flags&16)!==0){var B=y.deletions;if(B!==null){for(var W=0;W<B.length;W++){var me=B[W];for(We=me;We!==null;){var Ee=We;switch(Ee.tag){case 0:case 11:case 15:yl(8,Ee,y)}var we=Ee.child;if(we!==null)we.return=Ee,We=we;else for(;We!==null;){Ee=We;var Me=Ee.sibling,He=Ee.return;if(H0(Ee),Ee===me){We=null;break}if(Me!==null){Me.return=He,We=Me;break}We=He}}}var $e=y.alternate;if($e!==null){var Qe=$e.child;if(Qe!==null){$e.child=null;do{var pn=Qe.sibling;Qe.sibling=null,Qe=pn}while(Qe!==null)}}We=y}}if((y.subtreeFlags&2064)!==0&&R!==null)R.return=y,We=R;else e:for(;We!==null;){if(y=We,(y.flags&2048)!==0)switch(y.tag){case 0:case 11:case 15:yl(9,y,y.return)}var se=y.sibling;if(se!==null){se.return=y.return,We=se;break e}We=y.return}}var Y=n.current;for(We=Y;We!==null;){R=We;var ce=R.child;if((R.subtreeFlags&2064)!==0&&ce!==null)ce.return=R,We=ce;else e:for(R=Y;We!==null;){if(B=We,(B.flags&2048)!==0)try{switch(B.tag){case 0:case 11:case 15:Xc(9,B)}}catch(et){hn(B,B.return,et)}if(B===R){We=null;break e}var Te=B.sibling;if(Te!==null){Te.return=B.return,We=Te;break e}We=B.return}}if(At=m,os(),Ae&&typeof Ae.onPostCommitFiberRoot=="function")try{Ae.onPostCommitFiberRoot(ae,n)}catch{}u=!0}return u}finally{yt=o,Ai.transition=s}}return!1}function ix(n,s,o){s=Wa(o,s),s=S0(n,s,1),n=cs(n,s,1),s=qn(),n!==null&&(vt(n,1,s),ai(n,s))}function hn(n,s,o){if(n.tag===3)ix(n,n,o);else for(;s!==null;){if(s.tag===3){ix(s,n,o);break}else if(s.tag===1){var u=s.stateNode;if(typeof s.type.getDerivedStateFromError=="function"||typeof u.componentDidCatch=="function"&&(ds===null||!ds.has(u))){n=Wa(o,n),n=M0(s,n,1),s=cs(s,n,1),n=qn(),s!==null&&(vt(s,1,n),ai(s,n));break}}s=s.return}}function oM(n,s,o){var u=n.pingCache;u!==null&&u.delete(s),s=qn(),n.pingedLanes|=n.suspendedLanes&o,Tn===n&&(Dn&o)===o&&(_n===4||_n===3&&(Dn&130023424)===Dn&&500>an()-Bh?ta(n,0):zh|=o),ai(n,s)}function rx(n,s){s===0&&((n.mode&1)===0?s=1:(s=Je,Je<<=1,(Je&130023424)===0&&(Je=4194304)));var o=qn();n=Rr(n,s),n!==null&&(vt(n,s,o),ai(n,o))}function lM(n){var s=n.memoizedState,o=0;s!==null&&(o=s.retryLane),rx(n,o)}function cM(n,s){var o=0;switch(n.tag){case 13:var u=n.stateNode,m=n.memoizedState;m!==null&&(o=m.retryLane);break;case 19:u=n.stateNode;break;default:throw Error(t(314))}u!==null&&u.delete(s),rx(n,o)}var sx;sx=function(n,s,o){if(n!==null)if(n.memoizedProps!==s.pendingProps||ni.current)ri=!0;else{if((n.lanes&o)===0&&(s.flags&128)===0)return ri=!1,YS(n,s,o);ri=(n.flags&131072)!==0}else ri=!1,tn&&(s.flags&1048576)!==0&&kg(s,Ac,s.index);switch(s.lanes=0,s.tag){case 2:var u=s.type;jc(n,s),n=s.pendingProps;var m=Oa(s,On.current);Ga(s,o),m=xh(null,s,u,n,m,o);var y=vh();return s.flags|=1,typeof m=="object"&&m!==null&&typeof m.render=="function"&&m.$$typeof===void 0?(s.tag=1,s.memoizedState=null,s.updateQueue=null,ii(u)?(y=!0,Tc(s)):y=!1,s.memoizedState=m.state!==null&&m.state!==void 0?m.state:null,uh(s),m.updater=Vc,s.stateNode=m,m._reactInternals=s,wh(s,u,n,o),s=Rh(null,s,u,!0,y,o)):(s.tag=0,tn&&y&&eh(s),$n(null,s,m,o),s=s.child),s;case 16:u=s.elementType;e:{switch(jc(n,s),n=s.pendingProps,m=u._init,u=m(u._payload),s.type=u,m=s.tag=dM(u),n=Bi(u,n),m){case 0:s=Ch(null,s,u,n,o);break e;case 1:s=N0(null,s,u,n,o);break e;case 11:s=T0(null,s,u,n,o);break e;case 14:s=C0(null,s,u,Bi(u.type,n),o);break e}throw Error(t(306,u,""))}return s;case 0:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),Ch(n,s,u,m,o);case 1:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),N0(n,s,u,m,o);case 3:e:{if(L0(s),n===null)throw Error(t(387));u=s.pendingProps,y=s.memoizedState,m=y.element,$g(n,s),Uc(s,u,null,o);var R=s.memoizedState;if(u=R.element,y.isDehydrated)if(y={element:u,isDehydrated:!1,cache:R.cache,pendingSuspenseBoundaries:R.pendingSuspenseBoundaries,transitions:R.transitions},s.updateQueue.baseState=y,s.memoizedState=y,s.flags&256){m=Wa(Error(t(423)),s),s=D0(n,s,u,o,m);break e}else if(u!==m){m=Wa(Error(t(424)),s),s=D0(n,s,u,o,m);break e}else for(mi=rs(s.stateNode.containerInfo.firstChild),pi=s,tn=!0,zi=null,o=Wg(s,null,u,o),s.child=o;o;)o.flags=o.flags&-3|4096,o=o.sibling;else{if(Ba(),u===m){s=Pr(n,s,o);break e}$n(n,s,u,o)}s=s.child}return s;case 5:return Yg(s),n===null&&ih(s),u=s.type,m=s.pendingProps,y=n!==null?n.memoizedProps:null,R=m.children,qd(u,m)?R=null:y!==null&&qd(u,y)&&(s.flags|=32),P0(n,s),$n(n,s,R,o),s.child;case 6:return n===null&&ih(s),null;case 13:return I0(n,s,o);case 4:return dh(s,s.stateNode.containerInfo),u=s.pendingProps,n===null?s.child=Ha(s,null,u,o):$n(n,s,u,o),s.child;case 11:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),T0(n,s,u,m,o);case 7:return $n(n,s,s.pendingProps,o),s.child;case 8:return $n(n,s,s.pendingProps.children,o),s.child;case 12:return $n(n,s,s.pendingProps.children,o),s.child;case 10:e:{if(u=s.type._context,m=s.pendingProps,y=s.memoizedProps,R=m.value,$t(Lc,u._currentValue),u._currentValue=R,y!==null)if(ki(y.value,R)){if(y.children===m.children&&!ni.current){s=Pr(n,s,o);break e}}else for(y=s.child,y!==null&&(y.return=s);y!==null;){var B=y.dependencies;if(B!==null){R=y.child;for(var W=B.firstContext;W!==null;){if(W.context===u){if(y.tag===1){W=Ar(-1,o&-o),W.tag=2;var me=y.updateQueue;if(me!==null){me=me.shared;var Ee=me.pending;Ee===null?W.next=W:(W.next=Ee.next,Ee.next=W),me.pending=W}}y.lanes|=o,W=y.alternate,W!==null&&(W.lanes|=o),lh(y.return,o,s),B.lanes|=o;break}W=W.next}}else if(y.tag===10)R=y.type===s.type?null:y.child;else if(y.tag===18){if(R=y.return,R===null)throw Error(t(341));R.lanes|=o,B=R.alternate,B!==null&&(B.lanes|=o),lh(R,o,s),R=y.sibling}else R=y.child;if(R!==null)R.return=y;else for(R=y;R!==null;){if(R===s){R=null;break}if(y=R.sibling,y!==null){y.return=R.return,R=y;break}R=R.return}y=R}$n(n,s,m.children,o),s=s.child}return s;case 9:return m=s.type,u=s.pendingProps.children,Ga(s,o),m=Ci(m),u=u(m),s.flags|=1,$n(n,s,u,o),s.child;case 14:return u=s.type,m=Bi(u,s.pendingProps),m=Bi(u.type,m),C0(n,s,u,m,o);case 15:return R0(n,s,s.type,s.pendingProps,o);case 17:return u=s.type,m=s.pendingProps,m=s.elementType===u?m:Bi(u,m),jc(n,s),s.tag=1,ii(u)?(n=!0,Tc(s)):n=!1,Ga(s,o),_0(s,u,m),wh(s,u,m,o),Rh(null,s,u,!0,n,o);case 19:return F0(n,s,o);case 22:return A0(n,s,o)}throw Error(t(156,s.tag))};function ax(n,s){return js(n,s)}function uM(n,s,o,u){this.tag=n,this.key=o,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=s,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=u,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function Pi(n,s,o,u){return new uM(n,s,o,u)}function qh(n){return n=n.prototype,!(!n||!n.isReactComponent)}function dM(n){if(typeof n=="function")return qh(n)?1:0;if(n!=null){if(n=n.$$typeof,n===X)return 11;if(n===$)return 14}return 2}function ms(n,s){var o=n.alternate;return o===null?(o=Pi(n.tag,s,n.key,n.mode),o.elementType=n.elementType,o.type=n.type,o.stateNode=n.stateNode,o.alternate=n,n.alternate=o):(o.pendingProps=s,o.type=n.type,o.flags=0,o.subtreeFlags=0,o.deletions=null),o.flags=n.flags&14680064,o.childLanes=n.childLanes,o.lanes=n.lanes,o.child=n.child,o.memoizedProps=n.memoizedProps,o.memoizedState=n.memoizedState,o.updateQueue=n.updateQueue,s=n.dependencies,o.dependencies=s===null?null:{lanes:s.lanes,firstContext:s.firstContext},o.sibling=n.sibling,o.index=n.index,o.ref=n.ref,o}function tu(n,s,o,u,m,y){var R=2;if(u=n,typeof n=="function")qh(n)&&(R=1);else if(typeof n=="string")R=5;else e:switch(n){case U:return ia(o.children,m,y,s);case w:R=8,m|=8;break;case D:return n=Pi(12,o,s,m|2),n.elementType=D,n.lanes=y,n;case j:return n=Pi(13,o,s,m),n.elementType=j,n.lanes=y,n;case le:return n=Pi(19,o,s,m),n.elementType=le,n.lanes=y,n;case J:return nu(o,m,y,s);default:if(typeof n=="object"&&n!==null)switch(n.$$typeof){case z:R=10;break e;case H:R=9;break e;case X:R=11;break e;case $:R=14;break e;case ue:R=16,u=null;break e}throw Error(t(130,n==null?n:typeof n,""))}return s=Pi(R,o,s,m),s.elementType=n,s.type=u,s.lanes=y,s}function ia(n,s,o,u){return n=Pi(7,n,u,s),n.lanes=o,n}function nu(n,s,o,u){return n=Pi(22,n,u,s),n.elementType=J,n.lanes=o,n.stateNode={isHidden:!1},n}function Kh(n,s,o){return n=Pi(6,n,null,s),n.lanes=o,n}function Yh(n,s,o){return s=Pi(4,n.children!==null?n.children:[],n.key,s),s.lanes=o,s.stateNode={containerInfo:n.containerInfo,pendingChildren:null,implementation:n.implementation},s}function hM(n,s,o,u,m){this.tag=s,this.containerInfo=n,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=Nn(0),this.expirationTimes=Nn(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=Nn(0),this.identifierPrefix=u,this.onRecoverableError=m,this.mutableSourceEagerHydrationData=null}function Qh(n,s,o,u,m,y,R,B,W){return n=new hM(n,s,o,B,W),s===1?(s=1,y===!0&&(s|=8)):s=0,y=Pi(3,null,null,s),n.current=y,y.stateNode=n,y.memoizedState={element:u,isDehydrated:o,cache:null,transitions:null,pendingSuspenseBoundaries:null},uh(y),n}function fM(n,s,o){var u=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:N,key:u==null?null:""+u,children:n,containerInfo:s,implementation:o}}function ox(n){if(!n)return as;n=n._reactInternals;e:{if(Xn(n)!==n||n.tag!==1)throw Error(t(170));var s=n;do{switch(s.tag){case 3:s=s.stateNode.context;break e;case 1:if(ii(s.type)){s=s.stateNode.__reactInternalMemoizedMergedChildContext;break e}}s=s.return}while(s!==null);throw Error(t(171))}if(n.tag===1){var o=n.type;if(ii(o))return Ug(n,o,s)}return s}function lx(n,s,o,u,m,y,R,B,W){return n=Qh(o,u,!0,n,m,y,R,B,W),n.context=ox(null),o=n.current,u=qn(),m=fs(o),y=Ar(u,m),y.callback=s??null,cs(o,y,m),n.current.lanes=m,vt(n,m,u),ai(n,u),n}function iu(n,s,o,u){var m=s.current,y=qn(),R=fs(m);return o=ox(o),s.context===null?s.context=o:s.pendingContext=o,s=Ar(y,R),s.payload={element:n},u=u===void 0?null:u,u!==null&&(s.callback=u),n=cs(m,s,R),n!==null&&(Gi(n,m,R,y),Ic(n,m,R)),R}function ru(n){if(n=n.current,!n.child)return null;switch(n.child.tag){case 5:return n.child.stateNode;default:return n.child.stateNode}}function cx(n,s){if(n=n.memoizedState,n!==null&&n.dehydrated!==null){var o=n.retryLane;n.retryLane=o!==0&&o<s?o:s}}function Zh(n,s){cx(n,s),(n=n.alternate)&&cx(n,s)}function pM(){return null}var ux=typeof reportError=="function"?reportError:function(n){console.error(n)};function Jh(n){this._internalRoot=n}su.prototype.render=Jh.prototype.render=function(n){var s=this._internalRoot;if(s===null)throw Error(t(409));iu(n,s,null,null)},su.prototype.unmount=Jh.prototype.unmount=function(){var n=this._internalRoot;if(n!==null){this._internalRoot=null;var s=n.containerInfo;ea(function(){iu(null,n,null,null)}),s[wr]=null}};function su(n){this._internalRoot=n}su.prototype.unstable_scheduleHydration=function(n){if(n){var s=zt();n={blockedOn:null,target:n,priority:s};for(var o=0;o<ts.length&&s!==0&&s<ts[o].priority;o++);ts.splice(o,0,n),o===0&&Ym(n)}};function ef(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11)}function au(n){return!(!n||n.nodeType!==1&&n.nodeType!==9&&n.nodeType!==11&&(n.nodeType!==8||n.nodeValue!==" react-mount-point-unstable "))}function dx(){}function mM(n,s,o,u,m){if(m){if(typeof u=="function"){var y=u;u=function(){var me=ru(R);y.call(me)}}var R=lx(s,u,n,0,null,!1,!1,"",dx);return n._reactRootContainer=R,n[wr]=R.current,ol(n.nodeType===8?n.parentNode:n),ea(),R}for(;m=n.lastChild;)n.removeChild(m);if(typeof u=="function"){var B=u;u=function(){var me=ru(W);B.call(me)}}var W=Qh(n,0,!1,null,null,!1,!1,"",dx);return n._reactRootContainer=W,n[wr]=W.current,ol(n.nodeType===8?n.parentNode:n),ea(function(){iu(s,W,o,u)}),W}function ou(n,s,o,u,m){var y=o._reactRootContainer;if(y){var R=y;if(typeof m=="function"){var B=m;m=function(){var W=ru(R);B.call(W)}}iu(s,R,n,m)}else R=mM(o,s,n,m,u);return ru(R)}Ut=function(n){switch(n.tag){case 3:var s=n.stateNode;if(s.current.memoizedState.isDehydrated){var o=Rt(s.pendingLanes);o!==0&&(ti(s,o|1),ai(s,an()),(At&6)===0&&(qa=an()+500,os()))}break;case 13:ea(function(){var u=Rr(n,1);if(u!==null){var m=qn();Gi(u,n,1,m)}}),Zh(n,1)}},Kt=function(n){if(n.tag===13){var s=Rr(n,134217728);if(s!==null){var o=qn();Gi(s,n,134217728,o)}Zh(n,134217728)}},Fi=function(n){if(n.tag===13){var s=fs(n),o=Rr(n,s);if(o!==null){var u=qn();Gi(o,n,s,u)}Zh(n,s)}},zt=function(){return yt},Oi=function(n,s){var o=yt;try{return yt=n,s()}finally{yt=o}},rt=function(n,s,o){switch(s){case"input":if(Zt(n,o),s=o.name,o.type==="radio"&&s!=null){for(o=n;o.parentNode;)o=o.parentNode;for(o=o.querySelectorAll("input[name="+JSON.stringify(""+s)+'][type="radio"]'),s=0;s<o.length;s++){var u=o[s];if(u!==n&&u.form===n.form){var m=wc(u);if(!m)throw Error(t(90));Vt(u),Zt(u,m)}}}break;case"textarea":Pn(n,o);break;case"select":s=o.value,s!=null&&Ot(n,!!o.multiple,s,!1)}},Oe=Wh,Se=ea;var gM={usingClientEntryPoint:!1,Events:[ul,Ua,wc,_e,Ie,Wh]},wl={findFiberByHostInstance:Xs,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},xM={bundleType:wl.bundleType,version:wl.version,rendererPackageName:wl.rendererPackageName,rendererConfig:wl.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:C.ReactCurrentDispatcher,findHostInstanceByFiber:function(n){return n=Gs(n),n===null?null:n.stateNode},findFiberByHostInstance:wl.findFiberByHostInstance||pM,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){var lu=__REACT_DEVTOOLS_GLOBAL_HOOK__;if(!lu.isDisabled&&lu.supportsFiber)try{ae=lu.inject(xM),Ae=lu}catch{}}return oi.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=gM,oi.createPortal=function(n,s){var o=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!ef(s))throw Error(t(200));return fM(n,s,null,o)},oi.createRoot=function(n,s){if(!ef(n))throw Error(t(299));var o=!1,u="",m=ux;return s!=null&&(s.unstable_strictMode===!0&&(o=!0),s.identifierPrefix!==void 0&&(u=s.identifierPrefix),s.onRecoverableError!==void 0&&(m=s.onRecoverableError)),s=Qh(n,1,!1,null,null,o,!1,u,m),n[wr]=s.current,ol(n.nodeType===8?n.parentNode:n),new Jh(s)},oi.findDOMNode=function(n){if(n==null)return null;if(n.nodeType===1)return n;var s=n._reactInternals;if(s===void 0)throw typeof n.render=="function"?Error(t(188)):(n=Object.keys(n).join(","),Error(t(268,n)));return n=Gs(s),n=n===null?null:n.stateNode,n},oi.flushSync=function(n){return ea(n)},oi.hydrate=function(n,s,o){if(!au(s))throw Error(t(200));return ou(null,n,s,!0,o)},oi.hydrateRoot=function(n,s,o){if(!ef(n))throw Error(t(405));var u=o!=null&&o.hydratedSources||null,m=!1,y="",R=ux;if(o!=null&&(o.unstable_strictMode===!0&&(m=!0),o.identifierPrefix!==void 0&&(y=o.identifierPrefix),o.onRecoverableError!==void 0&&(R=o.onRecoverableError)),s=lx(s,null,n,1,o??null,m,!1,y,R),n[wr]=s.current,ol(n),u)for(n=0;n<u.length;n++)o=u[n],m=o._getVersion,m=m(o._source),s.mutableSourceEagerHydrationData==null?s.mutableSourceEagerHydrationData=[o,m]:s.mutableSourceEagerHydrationData.push(o,m);return new su(s)},oi.render=function(n,s,o){if(!au(s))throw Error(t(200));return ou(null,n,s,!1,o)},oi.unmountComponentAtNode=function(n){if(!au(n))throw Error(t(40));return n._reactRootContainer?(ea(function(){ou(null,null,n,!1,function(){n._reactRootContainer=null,n[wr]=null})}),!0):!1},oi.unstable_batchedUpdates=Wh,oi.unstable_renderSubtreeIntoContainer=function(n,s,o,u){if(!au(o))throw Error(t(200));if(n==null||n._reactInternals===void 0)throw Error(t(38));return ou(n,s,o,!1,u)},oi.version="18.3.1-next-f1338f8080-20240426",oi}var yx;function CM(){if(yx)return sf.exports;yx=1;function i(){if(!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!="function"))try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(i)}catch(e){console.error(e)}}return i(),sf.exports=TM(),sf.exports}var Sx;function RM(){if(Sx)return uu;Sx=1;var i=CM();return uu.createRoot=i.createRoot,uu.hydrateRoot=i.hydrateRoot,uu}var AM=RM(),Oo=class{constructor(){this.listeners=new Set,this.subscribe=this.subscribe.bind(this)}subscribe(i){return this.listeners.add(i),this.onSubscribe(),()=>{this.listeners.delete(i),this.onUnsubscribe()}}hasListeners(){return this.listeners.size>0}onSubscribe(){}onUnsubscribe(){}},fa,Ts,_o,r_,PM=(r_=class extends Oo{constructor(){super();it(this,fa);it(this,Ts);it(this,_o);ze(this,_o,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e();return window.addEventListener("visibilitychange",t,!1),()=>{window.removeEventListener("visibilitychange",t)}}})}onSubscribe(){G(this,Ts)||this.setEventListener(G(this,_o))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,Ts))==null||e.call(this),ze(this,Ts,void 0))}setEventListener(e){var t;ze(this,_o,e),(t=G(this,Ts))==null||t.call(this),ze(this,Ts,e(r=>{typeof r=="boolean"?this.setFocused(r):this.onFocus()}))}setFocused(e){G(this,fa)!==e&&(ze(this,fa,e),this.onFocus())}onFocus(){const e=this.isFocused();this.listeners.forEach(t=>{t(e)})}isFocused(){var e;return typeof G(this,fa)=="boolean"?G(this,fa):((e=globalThis.document)==null?void 0:e.visibilityState)!=="hidden"}},fa=new WeakMap,Ts=new WeakMap,_o=new WeakMap,r_),hm=new PM,NM={setTimeout:(i,e)=>setTimeout(i,e),clearTimeout:i=>clearTimeout(i),setInterval:(i,e)=>setInterval(i,e),clearInterval:i=>clearInterval(i)},Cs,um,s_,LM=(s_=class{constructor(){it(this,Cs,NM);it(this,um,!1)}setTimeoutProvider(i){ze(this,Cs,i)}setTimeout(i,e){return G(this,Cs).setTimeout(i,e)}clearTimeout(i){G(this,Cs).clearTimeout(i)}setInterval(i,e){return G(this,Cs).setInterval(i,e)}clearInterval(i){G(this,Cs).clearInterval(i)}},Cs=new WeakMap,um=new WeakMap,s_),ua=new LM;function DM(i){setTimeout(i,0)}var IM=typeof window>"u"||"Deno"in globalThis;function Zn(){}function UM(i,e){return typeof i=="function"?i(e):i}function Jf(i){return typeof i=="number"&&i>=0&&i!==1/0}function m_(i,e){return Math.max(i+(e||0)-Date.now(),0)}function Fs(i,e){return typeof i=="function"?i(e):i}function yi(i,e){return typeof i=="function"?i(e):i}function Mx(i,e){const{type:t="all",exact:r,fetchStatus:a,predicate:l,queryKey:c,stale:d}=i;if(c){if(r){if(e.queryHash!==fm(c,e.options))return!1}else if(!Hl(e.queryKey,c))return!1}if(t!=="all"){const h=e.isActive();if(t==="active"&&!h||t==="inactive"&&h)return!1}return!(typeof d=="boolean"&&e.isStale()!==d||a&&a!==e.state.fetchStatus||l&&!l(e))}function Ex(i,e){const{exact:t,status:r,predicate:a,mutationKey:l}=i;if(l){if(!e.options.mutationKey)return!1;if(t){if(Ma(e.options.mutationKey)!==Ma(l))return!1}else if(!Hl(e.options.mutationKey,l))return!1}return!(r&&e.state.status!==r||a&&!a(e))}function fm(i,e){return((e==null?void 0:e.queryKeyHashFn)||Ma)(i)}function Ma(i){return JSON.stringify(i,(e,t)=>ep(t)?Object.keys(t).sort().reduce((r,a)=>(r[a]=t[a],r),{}):t)}function Hl(i,e){return i===e?!0:typeof i!=typeof e?!1:i&&e&&typeof i=="object"&&typeof e=="object"?Object.keys(e).every(t=>Hl(i[t],e[t])):!1}var FM=Object.prototype.hasOwnProperty;function g_(i,e,t=0){if(i===e)return i;if(t>500)return e;const r=wx(i)&&wx(e);if(!r&&!(ep(i)&&ep(e)))return e;const l=(r?i:Object.keys(i)).length,c=r?e:Object.keys(e),d=c.length,h=r?new Array(d):{};let f=0;for(let g=0;g<d;g++){const p=r?g:c[g],v=i[p],_=e[p];if(v===_){h[p]=v,(r?g<l:FM.call(i,p))&&f++;continue}if(v===null||_===null||typeof v!="object"||typeof _!="object"){h[p]=_;continue}const E=g_(v,_,t+1);h[p]=E,E===v&&f++}return l===d&&f===l?i:h}function Ju(i,e){if(!e||Object.keys(i).length!==Object.keys(e).length)return!1;for(const t in i)if(i[t]!==e[t])return!1;return!0}function wx(i){return Array.isArray(i)&&i.length===Object.keys(i).length}function ep(i){if(!bx(i))return!1;const e=i.constructor;if(e===void 0)return!0;const t=e.prototype;return!(!bx(t)||!t.hasOwnProperty("isPrototypeOf")||Object.getPrototypeOf(i)!==Object.prototype)}function bx(i){return Object.prototype.toString.call(i)==="[object Object]"}function OM(i){return new Promise(e=>{ua.setTimeout(e,i)})}function tp(i,e,t){return typeof t.structuralSharing=="function"?t.structuralSharing(i,e):t.structuralSharing!==!1?g_(i,e):e}function kM(i,e,t=0){const r=[...i,e];return t&&r.length>t?r.slice(1):r}function zM(i,e,t=0){const r=[e,...i];return t&&r.length>t?r.slice(0,-1):r}var pm=Symbol();function x_(i,e){return!i.queryFn&&(e!=null&&e.initialPromise)?()=>e.initialPromise:!i.queryFn||i.queryFn===pm?()=>Promise.reject(new Error(`Missing queryFn: '${i.queryHash}'`)):i.queryFn}function mm(i,e){return typeof i=="function"?i(...e):!!i}function BM(i,e,t){let r=!1,a;return Object.defineProperty(i,"signal",{enumerable:!0,get:()=>(a??(a=e()),r||(r=!0,a.aborted?t():a.addEventListener("abort",t,{once:!0})),a)}),i}var Vl=(()=>{let i=()=>IM;return{isServer(){return i()},setIsServer(e){i=e}}})();function np(){let i,e;const t=new Promise((a,l)=>{i=a,e=l});t.status="pending",t.catch(()=>{});function r(a){Object.assign(t,a),delete t.resolve,delete t.reject}return t.resolve=a=>{r({status:"fulfilled",value:a}),i(a)},t.reject=a=>{r({status:"rejected",reason:a}),e(a)},t}var HM=DM;function VM(){let i=[],e=0,t=d=>{d()},r=d=>{d()},a=HM;const l=d=>{e?i.push(d):a(()=>{t(d)})},c=()=>{const d=i;i=[],d.length&&a(()=>{r(()=>{d.forEach(h=>{t(h)})})})};return{batch:d=>{let h;e++;try{h=d()}finally{e--,e||c()}return h},batchCalls:d=>(...h)=>{l(()=>{d(...h)})},schedule:l,setNotifyFunction:d=>{t=d},setBatchNotifyFunction:d=>{r=d},setScheduler:d=>{a=d}}}var Sn=VM(),yo,Rs,So,a_,GM=(a_=class extends Oo{constructor(){super();it(this,yo,!0);it(this,Rs);it(this,So);ze(this,So,e=>{if(typeof window<"u"&&window.addEventListener){const t=()=>e(!0),r=()=>e(!1);return window.addEventListener("online",t,!1),window.addEventListener("offline",r,!1),()=>{window.removeEventListener("online",t),window.removeEventListener("offline",r)}}})}onSubscribe(){G(this,Rs)||this.setEventListener(G(this,So))}onUnsubscribe(){var e;this.hasListeners()||((e=G(this,Rs))==null||e.call(this),ze(this,Rs,void 0))}setEventListener(e){var t;ze(this,So,e),(t=G(this,Rs))==null||t.call(this),ze(this,Rs,e(this.setOnline.bind(this)))}setOnline(e){G(this,yo)!==e&&(ze(this,yo,e),this.listeners.forEach(r=>{r(e)}))}isOnline(){return G(this,yo)}},yo=new WeakMap,Rs=new WeakMap,So=new WeakMap,a_),ed=new GM;function jM(i){return Math.min(1e3*2**i,3e4)}function v_(i){return(i??"online")==="online"?ed.isOnline():!0}var ip=class extends Error{constructor(i){super("CancelledError"),this.revert=i==null?void 0:i.revert,this.silent=i==null?void 0:i.silent}};function __(i){let e=!1,t=0,r;const a=np(),l=()=>a.status!=="pending",c=b=>{var M;if(!l()){const S=new ip(b);v(S),(M=i.onCancel)==null||M.call(i,S)}},d=()=>{e=!0},h=()=>{e=!1},f=()=>hm.isFocused()&&(i.networkMode==="always"||ed.isOnline())&&i.canRun(),g=()=>v_(i.networkMode)&&i.canRun(),p=b=>{l()||(r==null||r(),a.resolve(b))},v=b=>{l()||(r==null||r(),a.reject(b))},_=()=>new Promise(b=>{var M;r=S=>{(l()||f())&&b(S)},(M=i.onPause)==null||M.call(i)}).then(()=>{var b;r=void 0,l()||(b=i.onContinue)==null||b.call(i)}),E=()=>{if(l())return;let b;const M=t===0?i.initialPromise:void 0;try{b=M??i.fn()}catch(S){b=Promise.reject(S)}Promise.resolve(b).then(p).catch(S=>{var N;if(l())return;const P=i.retry??(Vl.isServer()?0:3),L=i.retryDelay??jM,C=typeof L=="function"?L(t,S):L,I=P===!0||typeof P=="number"&&t<P||typeof P=="function"&&P(t,S);if(e||!I){v(S);return}t++,(N=i.onFail)==null||N.call(i,t,S),OM(C).then(()=>f()?void 0:_()).then(()=>{e?v(S):E()})})};return{promise:a,status:()=>a.status,cancel:c,continue:()=>(r==null||r(),a),cancelRetry:d,continueRetry:h,canStart:g,start:()=>(g()?E():_().then(E),a)}}var pa,o_,y_=(o_=class{constructor(){it(this,pa)}destroy(){this.clearGcTimeout()}scheduleGc(){this.clearGcTimeout(),Jf(this.gcTime)&&ze(this,pa,ua.setTimeout(()=>{this.optionalRemove()},this.gcTime))}updateGcTime(i){this.gcTime=Math.max(this.gcTime||0,i??(Vl.isServer()?1/0:300*1e3))}clearGcTimeout(){G(this,pa)!==void 0&&(ua.clearTimeout(G(this,pa)),ze(this,pa,void 0))}},pa=new WeakMap,o_);function WM(i){return{onFetch:(e,t)=>{var g,p,v,_,E;const r=e.options,a=(v=(p=(g=e.fetchOptions)==null?void 0:g.meta)==null?void 0:p.fetchMore)==null?void 0:v.direction,l=((_=e.state.data)==null?void 0:_.pages)||[],c=((E=e.state.data)==null?void 0:E.pageParams)||[];let d={pages:[],pageParams:[]},h=0;const f=async()=>{let b=!1;const M=L=>{BM(L,()=>e.signal,()=>b=!0)},S=x_(e.options,e.fetchOptions),P=async(L,C,I)=>{if(b)return Promise.reject(e.signal.reason);if(C==null&&L.pages.length)return Promise.resolve(L);const U=(()=>{const H={client:e.client,queryKey:e.queryKey,pageParam:C,direction:I?"backward":"forward",meta:e.options.meta};return M(H),H})(),w=await S(U),{maxPages:D}=e.options,z=I?zM:kM;return{pages:z(L.pages,w,D),pageParams:z(L.pageParams,C,D)}};if(a&&l.length){const L=a==="backward",C=L?XM:Tx,I={pages:l,pageParams:c},N=C(r,I);d=await P(I,N,L)}else{const L=i??l.length;do{const C=h===0?c[0]??r.initialPageParam:Tx(r,d);if(h>0&&C==null)break;d=await P(d,C),h++}while(h<L)}return d};e.options.persister?e.fetchFn=()=>{var b,M;return(M=(b=e.options).persister)==null?void 0:M.call(b,f,{client:e.client,queryKey:e.queryKey,meta:e.options.meta,signal:e.signal},t)}:e.fetchFn=f}}}function Tx(i,{pages:e,pageParams:t}){const r=e.length-1;return e.length>0?i.getNextPageParam(e[r],e,t[r],t):void 0}function XM(i,{pages:e,pageParams:t}){var r;return e.length>0?(r=i.getPreviousPageParam)==null?void 0:r.call(i,e[0],e,t[0],t):void 0}var Mo,ma,Eo,Di,ga,An,Kl,xa,_i,S_,kr,l_,$M=(l_=class extends y_{constructor(e){super();it(this,_i);it(this,Mo);it(this,ma);it(this,Eo);it(this,Di);it(this,ga);it(this,An);it(this,Kl);it(this,xa);ze(this,xa,!1),ze(this,Kl,e.defaultOptions),this.setOptions(e.options),this.observers=[],ze(this,ga,e.client),ze(this,Di,G(this,ga).getQueryCache()),this.queryKey=e.queryKey,this.queryHash=e.queryHash,ze(this,ma,Rx(this.options)),this.state=e.state??G(this,ma),this.scheduleGc()}get meta(){return this.options.meta}get queryType(){return G(this,Mo)}get promise(){var e;return(e=G(this,An))==null?void 0:e.promise}setOptions(e){if(this.options={...G(this,Kl),...e},e!=null&&e._type&&ze(this,Mo,e._type),this.updateGcTime(this.options.gcTime),this.state&&this.state.data===void 0){const t=Rx(this.options);t.data!==void 0&&(this.setState(Cx(t.data,t.dataUpdatedAt)),ze(this,ma,t))}}optionalRemove(){!this.observers.length&&this.state.fetchStatus==="idle"&&G(this,Di).remove(this)}setData(e,t){const r=tp(this.state.data,e,this.options);return mt(this,_i,kr).call(this,{data:r,type:"success",dataUpdatedAt:t==null?void 0:t.updatedAt,manual:t==null?void 0:t.manual}),r}setState(e){mt(this,_i,kr).call(this,{type:"setState",state:e})}cancel(e){var r,a;const t=(r=G(this,An))==null?void 0:r.promise;return(a=G(this,An))==null||a.cancel(e),t?t.then(Zn).catch(Zn):Promise.resolve()}destroy(){super.destroy(),this.cancel({silent:!0})}get resetState(){return G(this,ma)}reset(){this.destroy(),this.setState(this.resetState)}isActive(){return this.observers.some(e=>yi(e.options.enabled,this)!==!1)}isDisabled(){return this.getObserversCount()>0?!this.isActive():this.options.queryFn===pm||!this.isFetched()}isFetched(){return this.state.dataUpdateCount+this.state.errorUpdateCount>0}isStatic(){return this.getObserversCount()>0?this.observers.some(e=>Fs(e.options.staleTime,this)==="static"):!1}isStale(){return this.getObserversCount()>0?this.observers.some(e=>e.getCurrentResult().isStale):this.state.data===void 0||this.state.isInvalidated}isStaleByTime(e=0){return this.state.data===void 0?!0:e==="static"?!1:this.state.isInvalidated?!0:!m_(this.state.dataUpdatedAt,e)}onFocus(){var t;const e=this.observers.find(r=>r.shouldFetchOnWindowFocus());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,An))==null||t.continue()}onOnline(){var t;const e=this.observers.find(r=>r.shouldFetchOnReconnect());e==null||e.refetch({cancelRefetch:!1}),(t=G(this,An))==null||t.continue()}addObserver(e){this.observers.includes(e)||(this.observers.push(e),this.clearGcTimeout(),G(this,Di).notify({type:"observerAdded",query:this,observer:e}))}removeObserver(e){this.observers.includes(e)&&(this.observers=this.observers.filter(t=>t!==e),this.observers.length||(G(this,An)&&(G(this,xa)||mt(this,_i,S_).call(this)?G(this,An).cancel({revert:!0}):G(this,An).cancelRetry()),this.scheduleGc()),G(this,Di).notify({type:"observerRemoved",query:this,observer:e}))}getObserversCount(){return this.observers.length}invalidate(){this.state.isInvalidated||mt(this,_i,kr).call(this,{type:"invalidate"})}async fetch(e,t){var f,g,p,v,_,E,b,M,S,P,L;if(this.state.fetchStatus!=="idle"&&((f=G(this,An))==null?void 0:f.status())!=="rejected"){if(this.state.data!==void 0&&(t!=null&&t.cancelRefetch))this.cancel({silent:!0});else if(G(this,An))return G(this,An).continueRetry(),G(this,An).promise}if(e&&this.setOptions(e),!this.options.queryFn){const C=this.observers.find(I=>I.options.queryFn);C&&this.setOptions(C.options)}const r=new AbortController,a=C=>{Object.defineProperty(C,"signal",{enumerable:!0,get:()=>(ze(this,xa,!0),r.signal)})},l=()=>{const C=x_(this.options,t),N=(()=>{const U={client:G(this,ga),queryKey:this.queryKey,meta:this.meta};return a(U),U})();return ze(this,xa,!1),this.options.persister?this.options.persister(C,N,this):C(N)},d=(()=>{const C={fetchOptions:t,options:this.options,queryKey:this.queryKey,client:G(this,ga),state:this.state,fetchFn:l};return a(C),C})(),h=G(this,Mo)==="infinite"?WM(this.options.pages):this.options.behavior;h==null||h.onFetch(d,this),ze(this,Eo,this.state),(this.state.fetchStatus==="idle"||this.state.fetchMeta!==((g=d.fetchOptions)==null?void 0:g.meta))&&mt(this,_i,kr).call(this,{type:"fetch",meta:(p=d.fetchOptions)==null?void 0:p.meta}),ze(this,An,__({initialPromise:t==null?void 0:t.initialPromise,fn:d.fetchFn,onCancel:C=>{C instanceof ip&&C.revert&&this.setState({...G(this,Eo),fetchStatus:"idle"}),r.abort()},onFail:(C,I)=>{mt(this,_i,kr).call(this,{type:"failed",failureCount:C,error:I})},onPause:()=>{mt(this,_i,kr).call(this,{type:"pause"})},onContinue:()=>{mt(this,_i,kr).call(this,{type:"continue"})},retry:d.options.retry,retryDelay:d.options.retryDelay,networkMode:d.options.networkMode,canRun:()=>!0}));try{const C=await G(this,An).start();if(C===void 0)throw new Error(`${this.queryHash} data is undefined`);return this.setData(C),(_=(v=G(this,Di).config).onSuccess)==null||_.call(v,C,this),(b=(E=G(this,Di).config).onSettled)==null||b.call(E,C,this.state.error,this),C}catch(C){if(C instanceof ip){if(C.silent)return G(this,An).promise;if(C.revert){if(this.state.data===void 0)throw C;return this.state.data}}throw mt(this,_i,kr).call(this,{type:"error",error:C}),(S=(M=G(this,Di).config).onError)==null||S.call(M,C,this),(L=(P=G(this,Di).config).onSettled)==null||L.call(P,this.state.data,C,this),C}finally{this.scheduleGc()}}},Mo=new WeakMap,ma=new WeakMap,Eo=new WeakMap,Di=new WeakMap,ga=new WeakMap,An=new WeakMap,Kl=new WeakMap,xa=new WeakMap,_i=new WeakSet,S_=function(){return this.state.fetchStatus==="paused"&&this.state.status==="pending"},kr=function(e){const t=r=>{switch(e.type){case"failed":return{...r,fetchFailureCount:e.failureCount,fetchFailureReason:e.error};case"pause":return{...r,fetchStatus:"paused"};case"continue":return{...r,fetchStatus:"fetching"};case"fetch":return{...r,...M_(r.data,this.options),fetchMeta:e.meta??null};case"success":const a={...r,...Cx(e.data,e.dataUpdatedAt),dataUpdateCount:r.dataUpdateCount+1,...!e.manual&&{fetchStatus:"idle",fetchFailureCount:0,fetchFailureReason:null}};return ze(this,Eo,e.manual?a:void 0),a;case"error":const l=e.error;return{...r,error:l,errorUpdateCount:r.errorUpdateCount+1,errorUpdatedAt:Date.now(),fetchFailureCount:r.fetchFailureCount+1,fetchFailureReason:l,fetchStatus:"idle",status:"error",isInvalidated:!0};case"invalidate":return{...r,isInvalidated:!0};case"setState":return{...r,...e.state}}};this.state=t(this.state),Sn.batch(()=>{this.observers.forEach(r=>{r.onQueryUpdate()}),G(this,Di).notify({query:this,type:"updated",action:e})})},l_);function M_(i,e){return{fetchFailureCount:0,fetchFailureReason:null,fetchStatus:v_(e.networkMode)?"fetching":"paused",...i===void 0&&{error:null,status:"pending"}}}function Cx(i,e){return{data:i,dataUpdatedAt:e??Date.now(),error:null,isInvalidated:!1,status:"success"}}function Rx(i){const e=typeof i.initialData=="function"?i.initialData():i.initialData,t=e!==void 0,r=t?typeof i.initialDataUpdatedAt=="function"?i.initialDataUpdatedAt():i.initialDataUpdatedAt:0;return{data:e,dataUpdateCount:0,dataUpdatedAt:t?r??Date.now():0,error:null,errorUpdateCount:0,errorUpdatedAt:0,fetchFailureCount:0,fetchFailureReason:null,fetchMeta:null,isInvalidated:!1,status:t?"success":"pending",fetchStatus:"idle"}}var ui,bt,Yl,Qn,va,wo,zr,As,Ql,bo,To,_a,ya,Ps,Co,Ft,Ul,rp,sp,ap,op,lp,cp,up,E_,c_,qM=(c_=class extends Oo{constructor(e,t){super();it(this,Ft);it(this,ui);it(this,bt);it(this,Yl);it(this,Qn);it(this,va);it(this,wo);it(this,zr);it(this,As);it(this,Ql);it(this,bo);it(this,To);it(this,_a);it(this,ya);it(this,Ps);it(this,Co,new Set);this.options=t,ze(this,ui,e),ze(this,As,null),ze(this,zr,np()),this.bindMethods(),this.setOptions(t)}bindMethods(){this.refetch=this.refetch.bind(this)}onSubscribe(){this.listeners.size===1&&(G(this,bt).addObserver(this),Ax(G(this,bt),this.options)?mt(this,Ft,Ul).call(this):this.updateResult(),mt(this,Ft,op).call(this))}onUnsubscribe(){this.hasListeners()||this.destroy()}shouldFetchOnReconnect(){return dp(G(this,bt),this.options,this.options.refetchOnReconnect)}shouldFetchOnWindowFocus(){return dp(G(this,bt),this.options,this.options.refetchOnWindowFocus)}destroy(){this.listeners=new Set,mt(this,Ft,lp).call(this),mt(this,Ft,cp).call(this),G(this,bt).removeObserver(this)}setOptions(e){const t=this.options,r=G(this,bt);if(this.options=G(this,ui).defaultQueryOptions(e),this.options.enabled!==void 0&&typeof this.options.enabled!="boolean"&&typeof this.options.enabled!="function"&&typeof yi(this.options.enabled,G(this,bt))!="boolean")throw new Error("Expected enabled to be a boolean or a callback that returns a boolean");mt(this,Ft,up).call(this),G(this,bt).setOptions(this.options),t._defaulted&&!Ju(this.options,t)&&G(this,ui).getQueryCache().notify({type:"observerOptionsUpdated",query:G(this,bt),observer:this});const a=this.hasListeners();a&&Px(G(this,bt),r,this.options,t)&&mt(this,Ft,Ul).call(this),this.updateResult(),a&&(G(this,bt)!==r||yi(this.options.enabled,G(this,bt))!==yi(t.enabled,G(this,bt))||Fs(this.options.staleTime,G(this,bt))!==Fs(t.staleTime,G(this,bt)))&&mt(this,Ft,rp).call(this);const l=mt(this,Ft,sp).call(this);a&&(G(this,bt)!==r||yi(this.options.enabled,G(this,bt))!==yi(t.enabled,G(this,bt))||l!==G(this,Ps))&&mt(this,Ft,ap).call(this,l)}getOptimisticResult(e){const t=G(this,ui).getQueryCache().build(G(this,ui),e),r=this.createResult(t,e);return YM(this,r)&&(ze(this,Qn,r),ze(this,wo,this.options),ze(this,va,G(this,bt).state)),r}getCurrentResult(){return G(this,Qn)}trackResult(e,t){return new Proxy(e,{get:(r,a)=>(this.trackProp(a),t==null||t(a),a==="promise"&&(this.trackProp("data"),!this.options.experimental_prefetchInRender&&G(this,zr).status==="pending"&&G(this,zr).reject(new Error("experimental_prefetchInRender feature flag is not enabled"))),Reflect.get(r,a))})}trackProp(e){G(this,Co).add(e)}getCurrentQuery(){return G(this,bt)}refetch({...e}={}){return this.fetch({...e})}fetchOptimistic(e){const t=G(this,ui).defaultQueryOptions(e),r=G(this,ui).getQueryCache().build(G(this,ui),t);return r.fetch().then(()=>this.createResult(r,t))}fetch(e){return mt(this,Ft,Ul).call(this,{...e,cancelRefetch:e.cancelRefetch??!0}).then(()=>(this.updateResult(),G(this,Qn)))}createResult(e,t){var D;const r=G(this,bt),a=this.options,l=G(this,Qn),c=G(this,va),d=G(this,wo),f=e!==r?e.state:G(this,Yl),{state:g}=e;let p={...g},v=!1,_;if(t._optimisticResults){const z=this.hasListeners(),H=!z&&Ax(e,t),X=z&&Px(e,r,t,a);(H||X)&&(p={...p,...M_(g.data,e.options)}),t._optimisticResults==="isRestoring"&&(p.fetchStatus="idle")}let{error:E,errorUpdatedAt:b,status:M}=p;_=p.data;let S=!1;if(t.placeholderData!==void 0&&_===void 0&&M==="pending"){let z;l!=null&&l.isPlaceholderData&&t.placeholderData===(d==null?void 0:d.placeholderData)?(z=l.data,S=!0):z=typeof t.placeholderData=="function"?t.placeholderData((D=G(this,To))==null?void 0:D.state.data,G(this,To)):t.placeholderData,z!==void 0&&(M="success",_=tp(l==null?void 0:l.data,z,t),v=!0)}if(t.select&&_!==void 0&&!S)if(l&&_===(c==null?void 0:c.data)&&t.select===G(this,Ql))_=G(this,bo);else try{ze(this,Ql,t.select),_=t.select(_),_=tp(l==null?void 0:l.data,_,t),ze(this,bo,_),ze(this,As,null)}catch(z){ze(this,As,z)}G(this,As)&&(E=G(this,As),_=G(this,bo),b=Date.now(),M="error");const P=p.fetchStatus==="fetching",L=M==="pending",C=M==="error",I=L&&P,N=_!==void 0,w={status:M,fetchStatus:p.fetchStatus,isPending:L,isSuccess:M==="success",isError:C,isInitialLoading:I,isLoading:I,data:_,dataUpdatedAt:p.dataUpdatedAt,error:E,errorUpdatedAt:b,failureCount:p.fetchFailureCount,failureReason:p.fetchFailureReason,errorUpdateCount:p.errorUpdateCount,isFetched:e.isFetched(),isFetchedAfterMount:p.dataUpdateCount>f.dataUpdateCount||p.errorUpdateCount>f.errorUpdateCount,isFetching:P,isRefetching:P&&!L,isLoadingError:C&&!N,isPaused:p.fetchStatus==="paused",isPlaceholderData:v,isRefetchError:C&&N,isStale:gm(e,t),refetch:this.refetch,promise:G(this,zr),isEnabled:yi(t.enabled,e)!==!1};if(this.options.experimental_prefetchInRender){const z=w.data!==void 0,H=w.status==="error"&&!z,X=$=>{H?$.reject(w.error):z&&$.resolve(w.data)},j=()=>{const $=ze(this,zr,w.promise=np());X($)},le=G(this,zr);switch(le.status){case"pending":e.queryHash===r.queryHash&&X(le);break;case"fulfilled":(H||w.data!==le.value)&&j();break;case"rejected":(!H||w.error!==le.reason)&&j();break}}return w}updateResult(){const e=G(this,Qn),t=this.createResult(G(this,bt),this.options);if(ze(this,va,G(this,bt).state),ze(this,wo,this.options),G(this,va).data!==void 0&&ze(this,To,G(this,bt)),Ju(t,e))return;ze(this,Qn,t);const r=()=>{if(!e)return!0;const{notifyOnChangeProps:a}=this.options,l=typeof a=="function"?a():a;if(l==="all"||!l&&!G(this,Co).size)return!0;const c=new Set(l??G(this,Co));return this.options.throwOnError&&c.add("error"),Object.keys(G(this,Qn)).some(d=>{const h=d;return G(this,Qn)[h]!==e[h]&&c.has(h)})};mt(this,Ft,E_).call(this,{listeners:r()})}onQueryUpdate(){this.updateResult(),this.hasListeners()&&mt(this,Ft,op).call(this)}},ui=new WeakMap,bt=new WeakMap,Yl=new WeakMap,Qn=new WeakMap,va=new WeakMap,wo=new WeakMap,zr=new WeakMap,As=new WeakMap,Ql=new WeakMap,bo=new WeakMap,To=new WeakMap,_a=new WeakMap,ya=new WeakMap,Ps=new WeakMap,Co=new WeakMap,Ft=new WeakSet,Ul=function(e){mt(this,Ft,up).call(this);let t=G(this,bt).fetch(this.options,e);return e!=null&&e.throwOnError||(t=t.catch(Zn)),t},rp=function(){mt(this,Ft,lp).call(this);const e=Fs(this.options.staleTime,G(this,bt));if(Vl.isServer()||G(this,Qn).isStale||!Jf(e))return;const r=m_(G(this,Qn).dataUpdatedAt,e)+1;ze(this,_a,ua.setTimeout(()=>{G(this,Qn).isStale||this.updateResult()},r))},sp=function(){return(typeof this.options.refetchInterval=="function"?this.options.refetchInterval(G(this,bt)):this.options.refetchInterval)??!1},ap=function(e){mt(this,Ft,cp).call(this),ze(this,Ps,e),!(Vl.isServer()||yi(this.options.enabled,G(this,bt))===!1||!Jf(G(this,Ps))||G(this,Ps)===0)&&ze(this,ya,ua.setInterval(()=>{(this.options.refetchIntervalInBackground||hm.isFocused())&&mt(this,Ft,Ul).call(this)},G(this,Ps)))},op=function(){mt(this,Ft,rp).call(this),mt(this,Ft,ap).call(this,mt(this,Ft,sp).call(this))},lp=function(){G(this,_a)!==void 0&&(ua.clearTimeout(G(this,_a)),ze(this,_a,void 0))},cp=function(){G(this,ya)!==void 0&&(ua.clearInterval(G(this,ya)),ze(this,ya,void 0))},up=function(){const e=G(this,ui).getQueryCache().build(G(this,ui),this.options);if(e===G(this,bt))return;const t=G(this,bt);ze(this,bt,e),ze(this,Yl,e.state),this.hasListeners()&&(t==null||t.removeObserver(this),e.addObserver(this))},E_=function(e){Sn.batch(()=>{e.listeners&&this.listeners.forEach(t=>{t(G(this,Qn))}),G(this,ui).getQueryCache().notify({query:G(this,bt),type:"observerResultsUpdated"})})},c_);function KM(i,e){return yi(e.enabled,i)!==!1&&i.state.data===void 0&&!(i.state.status==="error"&&yi(e.retryOnMount,i)===!1)}function Ax(i,e){return KM(i,e)||i.state.data!==void 0&&dp(i,e,e.refetchOnMount)}function dp(i,e,t){if(yi(e.enabled,i)!==!1&&Fs(e.staleTime,i)!=="static"){const r=typeof t=="function"?t(i):t;return r==="always"||r!==!1&&gm(i,e)}return!1}function Px(i,e,t,r){return(i!==e||yi(r.enabled,i)===!1)&&(!t.suspense||i.state.status!=="error")&&gm(i,t)}function gm(i,e){return yi(e.enabled,i)!==!1&&i.isStaleByTime(Fs(e.staleTime,i))}function YM(i,e){return!Ju(i.getCurrentResult(),e)}var Zl,or,Gn,Sa,lr,Es,u_,QM=(u_=class extends y_{constructor(e){super();it(this,lr);it(this,Zl);it(this,or);it(this,Gn);it(this,Sa);ze(this,Zl,e.client),this.mutationId=e.mutationId,ze(this,Gn,e.mutationCache),ze(this,or,[]),this.state=e.state||w_(),this.setOptions(e.options),this.scheduleGc()}setOptions(e){this.options=e,this.updateGcTime(this.options.gcTime)}get meta(){return this.options.meta}addObserver(e){G(this,or).includes(e)||(G(this,or).push(e),this.clearGcTimeout(),G(this,Gn).notify({type:"observerAdded",mutation:this,observer:e}))}removeObserver(e){ze(this,or,G(this,or).filter(t=>t!==e)),this.scheduleGc(),G(this,Gn).notify({type:"observerRemoved",mutation:this,observer:e})}optionalRemove(){G(this,or).length||(this.state.status==="pending"?this.scheduleGc():G(this,Gn).remove(this))}continue(){var e;return((e=G(this,Sa))==null?void 0:e.continue())??this.execute(this.state.variables)}async execute(e){var c,d,h,f,g,p,v,_,E,b,M,S,P,L,C,I,N,U;const t=()=>{mt(this,lr,Es).call(this,{type:"continue"})},r={client:G(this,Zl),meta:this.options.meta,mutationKey:this.options.mutationKey};ze(this,Sa,__({fn:()=>this.options.mutationFn?this.options.mutationFn(e,r):Promise.reject(new Error("No mutationFn found")),onFail:(w,D)=>{mt(this,lr,Es).call(this,{type:"failed",failureCount:w,error:D})},onPause:()=>{mt(this,lr,Es).call(this,{type:"pause"})},onContinue:t,retry:this.options.retry??0,retryDelay:this.options.retryDelay,networkMode:this.options.networkMode,canRun:()=>G(this,Gn).canRun(this)}));const a=this.state.status==="pending",l=!G(this,Sa).canStart();try{if(a)t();else{mt(this,lr,Es).call(this,{type:"pending",variables:e,isPaused:l}),G(this,Gn).config.onMutate&&await G(this,Gn).config.onMutate(e,this,r);const D=await((d=(c=this.options).onMutate)==null?void 0:d.call(c,e,r));D!==this.state.context&&mt(this,lr,Es).call(this,{type:"pending",context:D,variables:e,isPaused:l})}const w=await G(this,Sa).start();return await((f=(h=G(this,Gn).config).onSuccess)==null?void 0:f.call(h,w,e,this.state.context,this,r)),await((p=(g=this.options).onSuccess)==null?void 0:p.call(g,w,e,this.state.context,r)),await((_=(v=G(this,Gn).config).onSettled)==null?void 0:_.call(v,w,null,this.state.variables,this.state.context,this,r)),await((b=(E=this.options).onSettled)==null?void 0:b.call(E,w,null,e,this.state.context,r)),mt(this,lr,Es).call(this,{type:"success",data:w}),w}catch(w){try{await((S=(M=G(this,Gn).config).onError)==null?void 0:S.call(M,w,e,this.state.context,this,r))}catch(D){Promise.reject(D)}try{await((L=(P=this.options).onError)==null?void 0:L.call(P,w,e,this.state.context,r))}catch(D){Promise.reject(D)}try{await((I=(C=G(this,Gn).config).onSettled)==null?void 0:I.call(C,void 0,w,this.state.variables,this.state.context,this,r))}catch(D){Promise.reject(D)}try{await((U=(N=this.options).onSettled)==null?void 0:U.call(N,void 0,w,e,this.state.context,r))}catch(D){Promise.reject(D)}throw mt(this,lr,Es).call(this,{type:"error",error:w}),w}finally{G(this,Gn).runNext(this)}}},Zl=new WeakMap,or=new WeakMap,Gn=new WeakMap,Sa=new WeakMap,lr=new WeakSet,Es=function(e){const t=r=>{switch(e.type){case"failed":return{...r,failureCount:e.failureCount,failureReason:e.error};case"pause":return{...r,isPaused:!0};case"continue":return{...r,isPaused:!1};case"pending":return{...r,context:e.context,data:void 0,failureCount:0,failureReason:null,error:null,isPaused:e.isPaused,status:"pending",variables:e.variables,submittedAt:Date.now()};case"success":return{...r,data:e.data,failureCount:0,failureReason:null,error:null,status:"success",isPaused:!1};case"error":return{...r,data:void 0,error:e.error,failureCount:r.failureCount+1,failureReason:e.error,isPaused:!1,status:"error"}}};this.state=t(this.state),Sn.batch(()=>{G(this,or).forEach(r=>{r.onMutationUpdate(e)}),G(this,Gn).notify({mutation:this,type:"updated",action:e})})},u_);function w_(){return{context:void 0,data:void 0,error:null,failureCount:0,failureReason:null,isPaused:!1,status:"idle",variables:void 0,submittedAt:0}}var Br,$i,Jl,d_,ZM=(d_=class extends Oo{constructor(e={}){super();it(this,Br);it(this,$i);it(this,Jl);this.config=e,ze(this,Br,new Set),ze(this,$i,new Map),ze(this,Jl,0)}build(e,t,r){const a=new QM({client:e,mutationCache:this,mutationId:++cu(this,Jl)._,options:e.defaultMutationOptions(t),state:r});return this.add(a),a}add(e){G(this,Br).add(e);const t=du(e);if(typeof t=="string"){const r=G(this,$i).get(t);r?r.push(e):G(this,$i).set(t,[e])}this.notify({type:"added",mutation:e})}remove(e){if(G(this,Br).delete(e)){const t=du(e);if(typeof t=="string"){const r=G(this,$i).get(t);if(r)if(r.length>1){const a=r.indexOf(e);a!==-1&&r.splice(a,1)}else r[0]===e&&G(this,$i).delete(t)}}this.notify({type:"removed",mutation:e})}canRun(e){const t=du(e);if(typeof t=="string"){const r=G(this,$i).get(t),a=r==null?void 0:r.find(l=>l.state.status==="pending");return!a||a===e}else return!0}runNext(e){var r;const t=du(e);if(typeof t=="string"){const a=(r=G(this,$i).get(t))==null?void 0:r.find(l=>l!==e&&l.state.isPaused);return(a==null?void 0:a.continue())??Promise.resolve()}else return Promise.resolve()}clear(){Sn.batch(()=>{G(this,Br).forEach(e=>{this.notify({type:"removed",mutation:e})}),G(this,Br).clear(),G(this,$i).clear()})}getAll(){return Array.from(G(this,Br))}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Ex(t,r))}findAll(e={}){return this.getAll().filter(t=>Ex(e,t))}notify(e){Sn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}resumePausedMutations(){const e=this.getAll().filter(t=>t.state.isPaused);return Sn.batch(()=>Promise.all(e.map(t=>t.continue().catch(Zn))))}},Br=new WeakMap,$i=new WeakMap,Jl=new WeakMap,d_);function du(i){var e;return(e=i.options.scope)==null?void 0:e.id}var Hr,Ns,di,Vr,$r,Vu,hp,h_,JM=(h_=class extends Oo{constructor(t,r){super();it(this,$r);it(this,Hr);it(this,Ns);it(this,di);it(this,Vr);ze(this,Hr,t),this.setOptions(r),this.bindMethods(),mt(this,$r,Vu).call(this)}bindMethods(){this.mutate=this.mutate.bind(this),this.reset=this.reset.bind(this)}setOptions(t){var a;const r=this.options;this.options=G(this,Hr).defaultMutationOptions(t),Ju(this.options,r)||G(this,Hr).getMutationCache().notify({type:"observerOptionsUpdated",mutation:G(this,di),observer:this}),r!=null&&r.mutationKey&&this.options.mutationKey&&Ma(r.mutationKey)!==Ma(this.options.mutationKey)?this.reset():((a=G(this,di))==null?void 0:a.state.status)==="pending"&&G(this,di).setOptions(this.options)}onUnsubscribe(){var t;this.hasListeners()||(t=G(this,di))==null||t.removeObserver(this)}onMutationUpdate(t){mt(this,$r,Vu).call(this),mt(this,$r,hp).call(this,t)}getCurrentResult(){return G(this,Ns)}reset(){var t;(t=G(this,di))==null||t.removeObserver(this),ze(this,di,void 0),mt(this,$r,Vu).call(this),mt(this,$r,hp).call(this)}mutate(t,r){var a;return ze(this,Vr,r),(a=G(this,di))==null||a.removeObserver(this),ze(this,di,G(this,Hr).getMutationCache().build(G(this,Hr),this.options)),G(this,di).addObserver(this),G(this,di).execute(t)}},Hr=new WeakMap,Ns=new WeakMap,di=new WeakMap,Vr=new WeakMap,$r=new WeakSet,Vu=function(){var r;const t=((r=G(this,di))==null?void 0:r.state)??w_();ze(this,Ns,{...t,isPending:t.status==="pending",isSuccess:t.status==="success",isError:t.status==="error",isIdle:t.status==="idle",mutate:this.mutate,reset:this.reset})},hp=function(t){Sn.batch(()=>{var r,a,l,c,d,h,f,g;if(G(this,Vr)&&this.hasListeners()){const p=G(this,Ns).variables,v=G(this,Ns).context,_={client:G(this,Hr),meta:this.options.meta,mutationKey:this.options.mutationKey};if((t==null?void 0:t.type)==="success"){try{(a=(r=G(this,Vr)).onSuccess)==null||a.call(r,t.data,p,v,_)}catch(E){Promise.reject(E)}try{(c=(l=G(this,Vr)).onSettled)==null||c.call(l,t.data,null,p,v,_)}catch(E){Promise.reject(E)}}else if((t==null?void 0:t.type)==="error"){try{(h=(d=G(this,Vr)).onError)==null||h.call(d,t.error,p,v,_)}catch(E){Promise.reject(E)}try{(g=(f=G(this,Vr)).onSettled)==null||g.call(f,void 0,t.error,p,v,_)}catch(E){Promise.reject(E)}}}this.listeners.forEach(p=>{p(G(this,Ns))})})},h_),cr,f_,eE=(f_=class extends Oo{constructor(e={}){super();it(this,cr);this.config=e,ze(this,cr,new Map)}build(e,t,r){const a=t.queryKey,l=t.queryHash??fm(a,t);let c=this.get(l);return c||(c=new $M({client:e,queryKey:a,queryHash:l,options:e.defaultQueryOptions(t),state:r,defaultOptions:e.getQueryDefaults(a)}),this.add(c)),c}add(e){G(this,cr).has(e.queryHash)||(G(this,cr).set(e.queryHash,e),this.notify({type:"added",query:e}))}remove(e){const t=G(this,cr).get(e.queryHash);t&&(e.destroy(),t===e&&G(this,cr).delete(e.queryHash),this.notify({type:"removed",query:e}))}clear(){Sn.batch(()=>{this.getAll().forEach(e=>{this.remove(e)})})}get(e){return G(this,cr).get(e)}getAll(){return[...G(this,cr).values()]}find(e){const t={exact:!0,...e};return this.getAll().find(r=>Mx(t,r))}findAll(e={}){const t=this.getAll();return Object.keys(e).length>0?t.filter(r=>Mx(e,r)):t}notify(e){Sn.batch(()=>{this.listeners.forEach(t=>{t(e)})})}onFocus(){Sn.batch(()=>{this.getAll().forEach(e=>{e.onFocus()})})}onOnline(){Sn.batch(()=>{this.getAll().forEach(e=>{e.onOnline()})})}},cr=new WeakMap,f_),fn,Ls,Ds,Ro,Ao,Is,Po,No,p_,tE=(p_=class{constructor(i={}){it(this,fn);it(this,Ls);it(this,Ds);it(this,Ro);it(this,Ao);it(this,Is);it(this,Po);it(this,No);ze(this,fn,i.queryCache||new eE),ze(this,Ls,i.mutationCache||new ZM),ze(this,Ds,i.defaultOptions||{}),ze(this,Ro,new Map),ze(this,Ao,new Map),ze(this,Is,0)}mount(){cu(this,Is)._++,G(this,Is)===1&&(ze(this,Po,hm.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,fn).onFocus())})),ze(this,No,ed.subscribe(async i=>{i&&(await this.resumePausedMutations(),G(this,fn).onOnline())})))}unmount(){var i,e;cu(this,Is)._--,G(this,Is)===0&&((i=G(this,Po))==null||i.call(this),ze(this,Po,void 0),(e=G(this,No))==null||e.call(this),ze(this,No,void 0))}isFetching(i){return G(this,fn).findAll({...i,fetchStatus:"fetching"}).length}isMutating(i){return G(this,Ls).findAll({...i,status:"pending"}).length}getQueryData(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,fn).get(e.queryHash))==null?void 0:t.state.data}ensureQueryData(i){const e=this.defaultQueryOptions(i),t=G(this,fn).build(this,e),r=t.state.data;return r===void 0?this.fetchQuery(i):(i.revalidateIfStale&&t.isStaleByTime(Fs(e.staleTime,t))&&this.prefetchQuery(e),Promise.resolve(r))}getQueriesData(i){return G(this,fn).findAll(i).map(({queryKey:e,state:t})=>{const r=t.data;return[e,r]})}setQueryData(i,e,t){const r=this.defaultQueryOptions({queryKey:i}),a=G(this,fn).get(r.queryHash),l=a==null?void 0:a.state.data,c=UM(e,l);if(c!==void 0)return G(this,fn).build(this,r).setData(c,{...t,manual:!0})}setQueriesData(i,e,t){return Sn.batch(()=>G(this,fn).findAll(i).map(({queryKey:r})=>[r,this.setQueryData(r,e,t)]))}getQueryState(i){var t;const e=this.defaultQueryOptions({queryKey:i});return(t=G(this,fn).get(e.queryHash))==null?void 0:t.state}removeQueries(i){const e=G(this,fn);Sn.batch(()=>{e.findAll(i).forEach(t=>{e.remove(t)})})}resetQueries(i,e){const t=G(this,fn);return Sn.batch(()=>(t.findAll(i).forEach(r=>{r.reset()}),this.refetchQueries({type:"active",...i},e)))}cancelQueries(i,e={}){const t={revert:!0,...e},r=Sn.batch(()=>G(this,fn).findAll(i).map(a=>a.cancel(t)));return Promise.all(r).then(Zn).catch(Zn)}invalidateQueries(i,e={}){return Sn.batch(()=>(G(this,fn).findAll(i).forEach(t=>{t.invalidate()}),(i==null?void 0:i.refetchType)==="none"?Promise.resolve():this.refetchQueries({...i,type:(i==null?void 0:i.refetchType)??(i==null?void 0:i.type)??"active"},e)))}refetchQueries(i,e={}){const t={...e,cancelRefetch:e.cancelRefetch??!0},r=Sn.batch(()=>G(this,fn).findAll(i).filter(a=>!a.isDisabled()&&!a.isStatic()).map(a=>{let l=a.fetch(void 0,t);return t.throwOnError||(l=l.catch(Zn)),a.state.fetchStatus==="paused"?Promise.resolve():l}));return Promise.all(r).then(Zn)}fetchQuery(i){const e=this.defaultQueryOptions(i);e.retry===void 0&&(e.retry=!1);const t=G(this,fn).build(this,e);return t.isStaleByTime(Fs(e.staleTime,t))?t.fetch(e):Promise.resolve(t.state.data)}prefetchQuery(i){return this.fetchQuery(i).then(Zn).catch(Zn)}fetchInfiniteQuery(i){return i._type="infinite",this.fetchQuery(i)}prefetchInfiniteQuery(i){return this.fetchInfiniteQuery(i).then(Zn).catch(Zn)}ensureInfiniteQueryData(i){return i._type="infinite",this.ensureQueryData(i)}resumePausedMutations(){return ed.isOnline()?G(this,Ls).resumePausedMutations():Promise.resolve()}getQueryCache(){return G(this,fn)}getMutationCache(){return G(this,Ls)}getDefaultOptions(){return G(this,Ds)}setDefaultOptions(i){ze(this,Ds,i)}setQueryDefaults(i,e){G(this,Ro).set(Ma(i),{queryKey:i,defaultOptions:e})}getQueryDefaults(i){const e=[...G(this,Ro).values()],t={};return e.forEach(r=>{Hl(i,r.queryKey)&&Object.assign(t,r.defaultOptions)}),t}setMutationDefaults(i,e){G(this,Ao).set(Ma(i),{mutationKey:i,defaultOptions:e})}getMutationDefaults(i){const e=[...G(this,Ao).values()],t={};return e.forEach(r=>{Hl(i,r.mutationKey)&&Object.assign(t,r.defaultOptions)}),t}defaultQueryOptions(i){if(i._defaulted)return i;const e={...G(this,Ds).queries,...this.getQueryDefaults(i.queryKey),...i,_defaulted:!0};return e.queryHash||(e.queryHash=fm(e.queryKey,e)),e.refetchOnReconnect===void 0&&(e.refetchOnReconnect=e.networkMode!=="always"),e.throwOnError===void 0&&(e.throwOnError=!!e.suspense),!e.networkMode&&e.persister&&(e.networkMode="offlineFirst"),e.queryFn===pm&&(e.enabled=!1),e}defaultMutationOptions(i){return i!=null&&i._defaulted?i:{...G(this,Ds).mutations,...(i==null?void 0:i.mutationKey)&&this.getMutationDefaults(i.mutationKey),...i,_defaulted:!0}}clear(){G(this,fn).clear(),G(this,Ls).clear()}},fn=new WeakMap,Ls=new WeakMap,Ds=new WeakMap,Ro=new WeakMap,Ao=new WeakMap,Is=new WeakMap,Po=new WeakMap,No=new WeakMap,p_),b_=k.createContext(void 0),fd=i=>{const e=k.useContext(b_);if(!e)throw new Error("No QueryClient set, use QueryClientProvider to set one");return e},nE=({client:i,children:e})=>(k.useEffect(()=>(i.mount(),()=>{i.unmount()}),[i]),x.jsx(b_.Provider,{value:i,children:e})),T_=k.createContext(!1),iE=()=>k.useContext(T_);T_.Provider;function rE(){let i=!1;return{clearReset:()=>{i=!1},reset:()=>{i=!0},isReset:()=>i}}var sE=k.createContext(rE()),aE=()=>k.useContext(sE),oE=(i,e,t)=>{const r=t!=null&&t.state.error&&typeof i.throwOnError=="function"?mm(i.throwOnError,[t.state.error,t]):i.throwOnError;(i.suspense||i.experimental_prefetchInRender||r)&&(e.isReset()||(i.retryOnMount=!1))},lE=i=>{k.useEffect(()=>{i.clearReset()},[i])},cE=({result:i,errorResetBoundary:e,throwOnError:t,query:r,suspense:a})=>i.isError&&!e.isReset()&&!i.isFetching&&r&&(a&&i.data===void 0||mm(t,[i.error,r])),uE=i=>{if(i.suspense){const t=a=>a==="static"?a:Math.max(a??1e3,1e3),r=i.staleTime;i.staleTime=typeof r=="function"?(...a)=>t(r(...a)):t(r),typeof i.gcTime=="number"&&(i.gcTime=Math.max(i.gcTime,1e3))}},dE=(i,e)=>i.isLoading&&i.isFetching&&!e,hE=(i,e)=>(i==null?void 0:i.suspense)&&e.isPending,Nx=(i,e,t)=>e.fetchOptimistic(i).catch(()=>{t.clearReset()});function fE(i,e,t){var _,E,b,M;const r=iE(),a=aE(),l=fd(),c=l.defaultQueryOptions(i);(E=(_=l.getDefaultOptions().queries)==null?void 0:_._experimental_beforeQuery)==null||E.call(_,c);const d=l.getQueryCache().get(c.queryHash),h=i.subscribed!==!1;c._optimisticResults=r?"isRestoring":h?"optimistic":void 0,uE(c),oE(c,a,d),lE(a);const f=!l.getQueryCache().get(c.queryHash),[g]=k.useState(()=>new e(l,c)),p=g.getOptimisticResult(c),v=!r&&h;if(k.useSyncExternalStore(k.useCallback(S=>{const P=v?g.subscribe(Sn.batchCalls(S)):Zn;return g.updateResult(),P},[g,v]),()=>g.getCurrentResult(),()=>g.getCurrentResult()),k.useEffect(()=>{g.setOptions(c)},[c,g]),hE(c,p))throw Nx(c,g,a);if(cE({result:p,errorResetBoundary:a,throwOnError:c.throwOnError,query:d,suspense:c.suspense}))throw p.error;if((M=(b=l.getDefaultOptions().queries)==null?void 0:b._experimental_afterQuery)==null||M.call(b,c,p),c.experimental_prefetchInRender&&!Vl.isServer()&&dE(p,r)){const S=f?Nx(c,g,a):d==null?void 0:d.promise;S==null||S.catch(Zn).finally(()=>{g.updateResult()})}return c.notifyOnChangeProps?p:g.trackResult(p)}function gr(i,e){return fE(i,qM)}function Gr(i,e){const t=fd(),[r]=k.useState(()=>new JM(t,i));k.useEffect(()=>{r.setOptions(i)},[r,i]);const a=k.useSyncExternalStore(k.useCallback(c=>r.subscribe(Sn.batchCalls(c)),[r]),()=>r.getCurrentResult(),()=>r.getCurrentResult()),l=k.useCallback((c,d)=>{r.mutate(c,d).catch(Zn)},[r]);if(a.error&&mm(r.options.throwOnError,[a.error]))throw a.error;return{...a,mutate:l,mutateAsync:a.mutate}}/**
 * react-router v7.18.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */var xm=/^(?:[a-z][a-z0-9+.-]*:|[\\/]{2})/i,C_=/^[\\/]{2}/;function pE(i,e){return e+i.replace(/\\/g,"/")}var Lx="popstate";function Dx(i){return typeof i=="object"&&i!=null&&"pathname"in i&&"search"in i&&"hash"in i&&"state"in i&&"key"in i}function mE(i={}){function e(r,a){var f;let l=(f=a.state)==null?void 0:f.masked,{pathname:c,search:d,hash:h}=l||r.location;return fp("",{pathname:c,search:d,hash:h},a.state&&a.state.usr||null,a.state&&a.state.key||"default",l?{pathname:r.location.pathname,search:r.location.search,hash:r.location.hash}:void 0)}function t(r,a){return typeof a=="string"?a:Gl(a)}return xE(e,t,null,i)}function nn(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function Ui(i,e){if(!i){typeof console<"u"&&console.warn(e);try{throw new Error(e)}catch{}}}function gE(){return Math.random().toString(36).substring(2,10)}function Ix(i,e){return{usr:i.state,key:i.key,idx:e,masked:i.mask?{pathname:i.pathname,search:i.search,hash:i.hash}:void 0}}function fp(i,e,t=null,r,a){return{pathname:typeof i=="string"?i:i.pathname,search:"",hash:"",...typeof e=="string"?ko(e):e,state:t,key:e&&e.key||r||gE(),mask:a}}function Gl({pathname:i="/",search:e="",hash:t=""}){return e&&e!=="?"&&(i+=e.charAt(0)==="?"?e:"?"+e),t&&t!=="#"&&(i+=t.charAt(0)==="#"?t:"#"+t),i}function ko(i){let e={};if(i){let t=i.indexOf("#");t>=0&&(e.hash=i.substring(t),i=i.substring(0,t));let r=i.indexOf("?");r>=0&&(e.search=i.substring(r),i=i.substring(0,r)),i&&(e.pathname=i)}return e}function xE(i,e,t,r={}){let{window:a=document.defaultView,v5Compat:l=!1}=r,c=a.history,d="POP",h=null,f=g();f==null&&(f=0,c.replaceState({...c.state,idx:f},""));function g(){return(c.state||{idx:null}).idx}function p(){d="POP";let M=g(),S=M==null?null:M-f;f=M,h&&h({action:d,location:b.location,delta:S})}function v(M,S){d="PUSH";let P=Dx(M)?M:fp(b.location,M,S);f=g()+1;let L=Ix(P,f),C=b.createHref(P.mask||P);try{c.pushState(L,"",C)}catch(I){if(I instanceof DOMException&&I.name==="DataCloneError")throw I;a.location.assign(C)}l&&h&&h({action:d,location:b.location,delta:1})}function _(M,S){d="REPLACE";let P=Dx(M)?M:fp(b.location,M,S);f=g();let L=Ix(P,f),C=b.createHref(P.mask||P);c.replaceState(L,"",C),l&&h&&h({action:d,location:b.location,delta:0})}function E(M){return vE(a,M)}let b={get action(){return d},get location(){return i(a,c)},listen(M){if(h)throw new Error("A history only accepts one active listener");return a.addEventListener(Lx,p),h=M,()=>{a.removeEventListener(Lx,p),h=null}},createHref(M){return e(a,M)},createURL:E,encodeLocation(M){let S=E(M);return{pathname:S.pathname,search:S.search,hash:S.hash}},push:v,replace:_,go(M){return c.go(M)}};return b}function vE(i,e,t=!1){let r="http://localhost";i&&(r=i.location.origin!=="null"?i.location.origin:i.location.href),nn(r,"No window.location.(origin|href) available to create URL");let a=typeof e=="string"?e:Gl(e);return a=a.replace(/ $/,"%20"),!t&&C_.test(a)&&(a=r+a),new URL(a,r)}function R_(i,e,t="/"){return _E(i,e,t,!1)}function _E(i,e,t,r,a){let l=typeof e=="string"?ko(e):e,c=qr(l.pathname||"/",t);if(c==null)return null;let d=yE(i),h=null,f=NE(c);for(let g=0;h==null&&g<d.length;++g)h=PE(d[g],f,r);return h}function yE(i){let e=A_(i);return SE(e),e}function A_(i,e=[],t=[],r="",a=!1){let l=(c,d,h=a,f)=>{let g={relativePath:f===void 0?c.path||"":f,caseSensitive:c.caseSensitive===!0,childrenIndex:d,route:c};if(g.relativePath.startsWith("/")){if(!g.relativePath.startsWith(r)&&h)return;nn(g.relativePath.startsWith(r),`Absolute route path "${g.relativePath}" nested under path "${r}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`),g.relativePath=g.relativePath.slice(r.length)}let p=Yi([r,g.relativePath]),v=t.concat(g);c.children&&c.children.length>0&&(nn(c.index!==!0,`Index routes must not have child routes. Please remove all child routes from route path "${p}".`),A_(c.children,e,v,p,h)),!(c.path==null&&!c.index)&&e.push({path:p,score:RE(p,c.index),routesMeta:v.map((_,E)=>{let[b,M]=L_(_.relativePath,_.caseSensitive,E===v.length-1);return{..._,matcher:b,compiledParams:M}})})};return i.forEach((c,d)=>{var h;if(c.path===""||!((h=c.path)!=null&&h.includes("?")))l(c,d);else for(let f of P_(c.path))l(c,d,!0,f)}),e}function P_(i){let e=i.split("/");if(e.length===0)return[];let[t,...r]=e,a=t.endsWith("?"),l=t.replace(/\?$/,"");if(r.length===0)return a?[l,""]:[l];let c=P_(r.join("/")),d=[];return d.push(...c.map(h=>h===""?l:[l,h].join("/"))),a&&d.push(...c),d.map(h=>i.startsWith("/")&&h===""?"/":h)}function SE(i){i.sort((e,t)=>e.score!==t.score?t.score-e.score:AE(e.routesMeta.map(r=>r.childrenIndex),t.routesMeta.map(r=>r.childrenIndex)))}var ME=/^:[\w-]+$/,EE=3,wE=2,bE=1,TE=10,CE=-2,Ux=i=>i==="*";function RE(i,e){let t=i.split("/"),r=t.length;return t.some(Ux)&&(r+=CE),e&&(r+=wE),t.filter(a=>!Ux(a)).reduce((a,l)=>a+(ME.test(l)?EE:l===""?bE:TE),r)}function AE(i,e){return i.length===e.length&&i.slice(0,-1).every((r,a)=>r===e[a])?i[i.length-1]-e[e.length-1]:0}function PE(i,e,t=!1){let{routesMeta:r}=i,a={},l="/",c=[];for(let d=0;d<r.length;++d){let h=r[d],f=d===r.length-1,g=l==="/"?e:e.slice(l.length)||"/",p={path:h.relativePath,caseSensitive:h.caseSensitive,end:f},v=h.matcher&&h.compiledParams?N_(p,g,h.matcher,h.compiledParams):td(p,g),_=h.route;if(!v&&f&&t&&!r[r.length-1].route.index&&(v=td({path:h.relativePath,caseSensitive:h.caseSensitive,end:!1},g)),!v)return null;Object.assign(a,v.params),c.push({params:a,pathname:Yi([l,v.pathname]),pathnameBase:IE(Yi([l,v.pathnameBase])),route:_}),v.pathnameBase!=="/"&&(l=Yi([l,v.pathnameBase]))}return c}function td(i,e){typeof i=="string"&&(i={path:i,caseSensitive:!1,end:!0});let[t,r]=L_(i.path,i.caseSensitive,i.end);return N_(i,e,t,r)}function N_(i,e,t,r){let a=e.match(t);if(!a)return null;let l=a[0],c=l.replace(/(.)\/+$/,"$1"),d=a.slice(1);return{params:r.reduce((f,{paramName:g,isOptional:p},v)=>{if(g==="*"){let E=d[v]||"";c=l.slice(0,l.length-E.length).replace(/(.)\/+$/,"$1")}const _=d[v];return p&&!_?f[g]=void 0:f[g]=(_||"").replace(/%2F/g,"/"),f},{}),pathname:l,pathnameBase:c,pattern:i}}function L_(i,e=!1,t=!0){Ui(i==="*"||!i.endsWith("*")||i.endsWith("/*"),`Route path "${i}" will be treated as if it were "${i.replace(/\*$/,"/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${i.replace(/\*$/,"/*")}".`);let r=[],a="^"+i.replace(/\/*\*?$/,"").replace(/^\/*/,"/").replace(/[\\.*+^${}|()[\]]/g,"\\$&").replace(/\/:([\w-]+)(\?)?/g,(c,d,h,f,g)=>{if(r.push({paramName:d,isOptional:h!=null}),h){let p=g.charAt(f+c.length);return p&&p!=="/"?"/([^\\/]*)":"(?:/([^\\/]*))?"}return"/([^\\/]+)"}).replace(/\/([\w-]+)\?(\/|$)/g,"(/$1)?$2");return i.endsWith("*")?(r.push({paramName:"*"}),a+=i==="*"||i==="/*"?"(.*)$":"(?:\\/(.+)|\\/*)$"):t?a+="\\/*$":i!==""&&i!=="/"&&(a+="(?:(?=\\/|$))"),[new RegExp(a,e?void 0:"i"),r]}function NE(i){try{return i.split("/").map(e=>decodeURIComponent(e).replace(/\//g,"%2F")).join("/")}catch(e){return Ui(!1,`The URL path "${i}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${e}).`),i}}function qr(i,e){if(e==="/")return i;if(!i.toLowerCase().startsWith(e.toLowerCase()))return null;let t=e.endsWith("/")?e.length-1:e.length,r=i.charAt(t);return r&&r!=="/"?null:i.slice(t)||"/"}function LE(i,e="/"){let{pathname:t,search:r="",hash:a=""}=typeof i=="string"?ko(i):i,l;return t?(t=D_(t),t.startsWith("/")?l=Fx(t.substring(1),"/"):l=Fx(t,e)):l=e,{pathname:l,search:UE(r),hash:FE(a)}}function Fx(i,e){let t=nd(e).split("/");return i.split("/").forEach(a=>{a===".."?t.length>1&&t.pop():a!=="."&&t.push(a)}),t.length>1?t.join("/"):"/"}function lf(i,e,t,r){return`Cannot include a '${i}' character in a manually specified \`to.${e}\` field [${JSON.stringify(r)}].  Please separate it out to the \`to.${t}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`}function DE(i){return i.filter((e,t)=>t===0||e.route.path&&e.route.path.length>0)}function vm(i){let e=DE(i);return e.map((t,r)=>r===e.length-1?t.pathname:t.pathnameBase)}function pd(i,e,t,r=!1){let a;typeof i=="string"?a=ko(i):(a={...i},nn(!a.pathname||!a.pathname.includes("?"),lf("?","pathname","search",a)),nn(!a.pathname||!a.pathname.includes("#"),lf("#","pathname","hash",a)),nn(!a.search||!a.search.includes("#"),lf("#","search","hash",a)));let l=i===""||a.pathname==="",c=l?"/":a.pathname,d;if(c==null)d=t;else{let p=e.length-1;if(!r&&c.startsWith("..")){let v=c.split("/");for(;v[0]==="..";)v.shift(),p-=1;a.pathname=v.join("/")}d=p>=0?e[p]:"/"}let h=LE(a,d),f=c&&c!=="/"&&c.endsWith("/"),g=(l||c===".")&&t.endsWith("/");return!h.pathname.endsWith("/")&&(f||g)&&(h.pathname+="/"),h}var D_=i=>i.replace(/[\\/]{2,}/g,"/"),Yi=i=>D_(i.join("/")),nd=i=>i.replace(/\/+$/,""),IE=i=>nd(i).replace(/^\/*/,"/"),UE=i=>!i||i==="?"?"":i.startsWith("?")?i:"?"+i,FE=i=>!i||i==="#"?"":i.startsWith("#")?i:"#"+i,OE=class{constructor(i,e,t,r=!1){this.status=i,this.statusText=e||"",this.internal=r,t instanceof Error?(this.data=t.toString(),this.error=t):this.data=t}};function kE(i){return i!=null&&typeof i.status=="number"&&typeof i.statusText=="string"&&typeof i.internal=="boolean"&&"data"in i}function zE(i){let e=i.map(t=>t.route.path).filter(Boolean);return Yi(e)||"/"}var I_=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";function U_(i,e){let t=i;if(typeof t!="string"||!xm.test(t))return{absoluteURL:void 0,isExternal:!1,to:t};let r=t,a=!1;if(I_)try{let l=new URL(window.location.href),c=C_.test(t)?new URL(pE(t,l.protocol)):new URL(t),d=qr(c.pathname,e);c.origin===l.origin&&d!=null?t=d+c.search+c.hash:a=!0}catch{Ui(!1,`<Link to="${t}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`)}return{absoluteURL:r,isExternal:a,to:t}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");var F_=["POST","PUT","PATCH","DELETE"];new Set(F_);var BE=["GET",...F_];new Set(BE);var HE=["about:","blob:","chrome:","chrome-untrusted:","content:","data:","devtools:","file:","filesystem:","javascript:"];function VE(i){try{return HE.includes(new URL(i).protocol)}catch{return!1}}var zo=k.createContext(null);zo.displayName="DataRouter";var md=k.createContext(null);md.displayName="DataRouterState";var O_=k.createContext(!1);function GE(){return k.useContext(O_)}var k_=k.createContext({isTransitioning:!1});k_.displayName="ViewTransition";var jE=k.createContext(new Map);jE.displayName="Fetchers";var WE=k.createContext(null);WE.displayName="Await";var Ei=k.createContext(null);Ei.displayName="Navigation";var ec=k.createContext(null);ec.displayName="Location";var Zi=k.createContext({outlet:null,matches:[],isDataRoute:!1});Zi.displayName="Route";var _m=k.createContext(null);_m.displayName="RouteError";var z_="REACT_ROUTER_ERROR",XE="REDIRECT",$E="ROUTE_ERROR_RESPONSE";function qE(i){if(i.startsWith(`${z_}:${XE}:{`))try{let e=JSON.parse(i.slice(28));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string"&&typeof e.location=="string"&&typeof e.reloadDocument=="boolean"&&typeof e.replace=="boolean")return e}catch{}}function KE(i){if(i.startsWith(`${z_}:${$E}:{`))try{let e=JSON.parse(i.slice(40));if(typeof e=="object"&&e&&typeof e.status=="number"&&typeof e.statusText=="string")return new OE(e.status,e.statusText,e.data)}catch{}}function YE(i,{relative:e}={}){nn(Bo(),"useHref() may be used only in the context of a <Router> component.");let{basename:t,navigator:r}=k.useContext(Ei),{hash:a,pathname:l,search:c}=tc(i,{relative:e}),d=l;return t!=="/"&&(d=l==="/"?t:Yi([t,l])),r.createHref({pathname:d,search:c,hash:a})}function Bo(){return k.useContext(ec)!=null}function Ji(){return nn(Bo(),"useLocation() may be used only in the context of a <Router> component."),k.useContext(ec).location}var B_="You should call navigate() in a React.useEffect(), not when your component is first rendered.";function H_(i){k.useContext(Ei).static||k.useLayoutEffect(i)}function ym(){let{isDataRoute:i}=k.useContext(Zi);return i?d1():QE()}function QE(){nn(Bo(),"useNavigate() may be used only in the context of a <Router> component.");let i=k.useContext(zo),{basename:e,navigator:t}=k.useContext(Ei),{matches:r}=k.useContext(Zi),{pathname:a}=Ji(),l=JSON.stringify(vm(r)),c=k.useRef(!1);return H_(()=>{c.current=!0}),k.useCallback((h,f={})=>{if(Ui(c.current,B_),!c.current)return;if(typeof h=="number"){t.go(h);return}let g=pd(h,JSON.parse(l),a,f.relative==="path");i==null&&e!=="/"&&(g.pathname=g.pathname==="/"?e:Yi([e,g.pathname])),(f.replace?t.replace:t.push)(g,f.state,f)},[e,t,l,a,i])}var ZE=k.createContext(null);function JE(i){let e=k.useContext(Zi).outlet;return k.useMemo(()=>e&&k.createElement(ZE.Provider,{value:i},e),[e,i])}function tc(i,{relative:e}={}){let{matches:t}=k.useContext(Zi),{pathname:r}=Ji(),a=JSON.stringify(vm(t));return k.useMemo(()=>pd(i,JSON.parse(a),r,e==="path"),[i,a,r,e])}function e1(i,e){return V_(i,e)}function V_(i,e,t){var M;nn(Bo(),"useRoutes() may be used only in the context of a <Router> component.");let{navigator:r}=k.useContext(Ei),{matches:a}=k.useContext(Zi),l=a[a.length-1],c=l?l.params:{},d=l?l.pathname:"/",h=l?l.pathnameBase:"/",f=l&&l.route;{let S=f&&f.path||"";j_(d,!f||S.endsWith("*")||S.endsWith("*?"),`You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${S}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${S}"> to <Route path="${S==="/"?"*":`${S}/*`}">.`)}let g=Ji(),p;if(e){let S=typeof e=="string"?ko(e):e;nn(h==="/"||((M=S.pathname)==null?void 0:M.startsWith(h)),`When overriding the location using \`<Routes location>\` or \`useRoutes(routes, location)\`, the location pathname must begin with the portion of the URL pathname that was matched by all parent routes. The current pathname base is "${h}" but pathname "${S.pathname}" was given in the \`location\` prop.`),p=S}else p=g;let v=p.pathname||"/",_=v;if(h!=="/"){let S=h.replace(/^\//,"").split("/");_="/"+v.replace(/^\//,"").split("/").slice(S.length).join("/")}let E=t&&t.state.matches.length?t.state.matches.map(S=>Object.assign(S,{route:t.manifest[S.route.id]||S.route})):R_(i,{pathname:_});Ui(f||E!=null,`No routes matched location "${p.pathname}${p.search}${p.hash}" `),Ui(E==null||E[E.length-1].route.element!==void 0||E[E.length-1].route.Component!==void 0||E[E.length-1].route.lazy!==void 0,`Matched leaf route at location "${p.pathname}${p.search}${p.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`);let b=s1(E&&E.map(S=>Object.assign({},S,{params:Object.assign({},c,S.params),pathname:Yi([h,r.encodeLocation?r.encodeLocation(S.pathname.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathname]),pathnameBase:S.pathnameBase==="/"?h:Yi([h,r.encodeLocation?r.encodeLocation(S.pathnameBase.replace(/%/g,"%25").replace(/\?/g,"%3F").replace(/#/g,"%23")).pathname:S.pathnameBase])})),a,t);return e&&b?k.createElement(ec.Provider,{value:{location:{pathname:"/",search:"",hash:"",state:null,key:"default",mask:void 0,...p},navigationType:"POP"}},b):b}function t1(){let i=u1(),e=kE(i)?`${i.status} ${i.statusText}`:i instanceof Error?i.message:JSON.stringify(i),t=i instanceof Error?i.stack:null,r="rgba(200,200,200, 0.5)",a={padding:"0.5rem",backgroundColor:r},l={padding:"2px 4px",backgroundColor:r},c=null;return console.error("Error handled by React Router default ErrorBoundary:",i),c=k.createElement(k.Fragment,null,k.createElement("p",null,"💿 Hey developer 👋"),k.createElement("p",null,"You can provide a way better UX than this when your app throws errors by providing your own ",k.createElement("code",{style:l},"ErrorBoundary")," or"," ",k.createElement("code",{style:l},"errorElement")," prop on your route.")),k.createElement(k.Fragment,null,k.createElement("h2",null,"Unexpected Application Error!"),k.createElement("h3",{style:{fontStyle:"italic"}},e),t?k.createElement("pre",{style:a},t):null,c)}var n1=k.createElement(t1,null),G_=class extends k.Component{constructor(i){super(i),this.state={location:i.location,revalidation:i.revalidation,error:i.error}}static getDerivedStateFromError(i){return{error:i}}static getDerivedStateFromProps(i,e){return e.location!==i.location||e.revalidation!=="idle"&&i.revalidation==="idle"?{error:i.error,location:i.location,revalidation:i.revalidation}:{error:i.error!==void 0?i.error:e.error,location:e.location,revalidation:i.revalidation||e.revalidation}}componentDidCatch(i,e){this.props.onError?this.props.onError(i,e):console.error("React Router caught the following error during render",i)}render(){let i=this.state.error;if(this.context&&typeof i=="object"&&i&&"digest"in i&&typeof i.digest=="string"){const t=KE(i.digest);t&&(i=t)}let e=i!==void 0?k.createElement(Zi.Provider,{value:this.props.routeContext},k.createElement(_m.Provider,{value:i,children:this.props.component})):this.props.children;return this.context?k.createElement(i1,{error:i},e):e}};G_.contextType=O_;var cf=new WeakMap;function i1({children:i,error:e}){let{basename:t}=k.useContext(Ei);if(typeof e=="object"&&e&&"digest"in e&&typeof e.digest=="string"){let r=qE(e.digest);if(r){let a=cf.get(e);if(a)throw a;let l=U_(r.location,t),c=l.absoluteURL||l.to;if(VE(c))throw new Error("Invalid redirect location");if(I_&&!cf.get(e))if(l.isExternal||r.reloadDocument)window.location.href=c;else{const d=Promise.resolve().then(()=>window.__reactRouterDataRouter.navigate(l.to,{replace:r.replace}));throw cf.set(e,d),d}return k.createElement("meta",{httpEquiv:"refresh",content:`0;url=${c}`})}}return i}function r1({routeContext:i,match:e,children:t}){let r=k.useContext(zo);return r&&r.static&&r.staticContext&&(e.route.errorElement||e.route.ErrorBoundary)&&(r.staticContext._deepestRenderedBoundaryId=e.route.id),k.createElement(Zi.Provider,{value:i},t)}function s1(i,e=[],t){let r=t==null?void 0:t.state;if(i==null){if(!r)return null;if(r.errors)i=r.matches;else if(e.length===0&&!r.initialized&&r.matches.length>0)i=r.matches;else return null}let a=i,l=r==null?void 0:r.errors;if(l!=null){let g=a.findIndex(p=>p.route.id&&(l==null?void 0:l[p.route.id])!==void 0);nn(g>=0,`Could not find a matching route for errors on route IDs: ${Object.keys(l).join(",")}`),a=a.slice(0,Math.min(a.length,g+1))}let c=!1,d=-1;if(t&&r){c=r.renderFallback;for(let g=0;g<a.length;g++){let p=a[g];if((p.route.HydrateFallback||p.route.hydrateFallbackElement)&&(d=g),p.route.id){let{loaderData:v,errors:_}=r,E=p.route.loader&&!v.hasOwnProperty(p.route.id)&&(!_||_[p.route.id]===void 0);if(p.route.lazy||E){t.isStatic&&(c=!0),d>=0?a=a.slice(0,d+1):a=[a[0]];break}}}}let h=t==null?void 0:t.onError,f=r&&h?(g,p)=>{var v,_;h(g,{location:r.location,params:((_=(v=r.matches)==null?void 0:v[0])==null?void 0:_.params)??{},pattern:zE(r.matches),errorInfo:p})}:void 0;return a.reduceRight((g,p,v)=>{let _,E=!1,b=null,M=null;r&&(_=l&&p.route.id?l[p.route.id]:void 0,b=p.route.errorElement||n1,c&&(d<0&&v===0?(j_("route-fallback",!1,"No `HydrateFallback` element provided to render during initial hydration"),E=!0,M=null):d===v&&(E=!0,M=p.route.hydrateFallbackElement||null)));let S=e.concat(a.slice(0,v+1)),P=()=>{let L;return _?L=b:E?L=M:p.route.Component?L=k.createElement(p.route.Component,null):p.route.element?L=p.route.element:L=g,k.createElement(r1,{match:p,routeContext:{outlet:g,matches:S,isDataRoute:r!=null},children:L})};return r&&(p.route.ErrorBoundary||p.route.errorElement||v===0)?k.createElement(G_,{location:r.location,revalidation:r.revalidation,component:b,error:_,children:P(),routeContext:{outlet:null,matches:S,isDataRoute:!0},onError:f}):P()},null)}function Sm(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function a1(i){let e=k.useContext(zo);return nn(e,Sm(i)),e}function o1(i){let e=k.useContext(md);return nn(e,Sm(i)),e}function l1(i){let e=k.useContext(Zi);return nn(e,Sm(i)),e}function Mm(i){let e=l1(i),t=e.matches[e.matches.length-1];return nn(t.route.id,`${i} can only be used on routes that contain a unique "id"`),t.route.id}function c1(){return Mm("useRouteId")}function u1(){var r;let i=k.useContext(_m),e=o1("useRouteError"),t=Mm("useRouteError");return i!==void 0?i:(r=e.errors)==null?void 0:r[t]}function d1(){let{router:i}=a1("useNavigate"),e=Mm("useNavigate"),t=k.useRef(!1);return H_(()=>{t.current=!0}),k.useCallback(async(a,l={})=>{Ui(t.current,B_),t.current&&(typeof a=="number"?await i.navigate(a):await i.navigate(a,{fromRouteId:e,...l}))},[i,e])}var Ox={};function j_(i,e,t){!e&&!Ox[i]&&(Ox[i]=!0,Ui(!1,t))}k.memo(h1);function h1({routes:i,manifest:e,future:t,state:r,isStatic:a,onError:l}){return V_(i,void 0,{manifest:e,state:r,isStatic:a,onError:l})}function uf({to:i,replace:e,state:t,relative:r}){nn(Bo(),"<Navigate> may be used only in the context of a <Router> component.");let{static:a}=k.useContext(Ei);Ui(!a,"<Navigate> must not be used on the initial render in a <StaticRouter>. This is a no-op, but you should modify your code so the <Navigate> is only ever rendered in response to some user interaction or state change.");let{matches:l}=k.useContext(Zi),{pathname:c}=Ji(),d=ym(),h=pd(i,vm(l),c,r==="path"),f=JSON.stringify(h);return k.useEffect(()=>{d(JSON.parse(f),{replace:e,state:t,relative:r})},[d,f,r,e,t]),null}function f1(i){return JE(i.context)}function Kn(i){nn(!1,"A <Route> is only ever to be used as the child of <Routes> element, never rendered directly. Please wrap your <Route> in a <Routes>.")}function p1({basename:i="/",children:e=null,location:t,navigationType:r="POP",navigator:a,static:l=!1,useTransitions:c}){nn(!Bo(),"You cannot render a <Router> inside another <Router>. You should never have more than one in your app.");let d=i.replace(/^\/*/,"/"),h=k.useMemo(()=>({basename:d,navigator:a,static:l,useTransitions:c,future:{}}),[d,a,l,c]);typeof t=="string"&&(t=ko(t));let{pathname:f="/",search:g="",hash:p="",state:v=null,key:_="default",mask:E}=t,b=k.useMemo(()=>{let M=qr(f,d);return M==null?null:{location:{pathname:M,search:g,hash:p,state:v,key:_,mask:E},navigationType:r}},[d,f,g,p,v,_,r,E]);return Ui(b!=null,`<Router basename="${d}"> is not able to match the URL "${f}${g}${p}" because it does not start with the basename, so the <Router> won't render anything.`),b==null?null:k.createElement(Ei.Provider,{value:h},k.createElement(ec.Provider,{children:e,value:b}))}function m1({children:i,location:e}){return e1(pp(i),e)}function pp(i,e=[]){let t=[];return k.Children.forEach(i,(r,a)=>{if(!k.isValidElement(r))return;let l=[...e,a];if(r.type===k.Fragment){t.push.apply(t,pp(r.props.children,l));return}nn(r.type===Kn,`[${typeof r.type=="string"?r.type:r.type.name}] is not a <Route> component. All component children of <Routes> must be a <Route> or <React.Fragment>`),nn(!r.props.index||!r.props.children,"An index route cannot have child routes.");let c={id:r.props.id||l.join("-"),caseSensitive:r.props.caseSensitive,element:r.props.element,Component:r.props.Component,index:r.props.index,path:r.props.path,middleware:r.props.middleware,loader:r.props.loader,action:r.props.action,hydrateFallbackElement:r.props.hydrateFallbackElement,HydrateFallback:r.props.HydrateFallback,errorElement:r.props.errorElement,ErrorBoundary:r.props.ErrorBoundary,hasErrorBoundary:r.props.hasErrorBoundary===!0||r.props.ErrorBoundary!=null||r.props.errorElement!=null,shouldRevalidate:r.props.shouldRevalidate,handle:r.props.handle,lazy:r.props.lazy};r.props.children&&(c.children=pp(r.props.children,l)),t.push(c)}),t}var Gu="get",ju="application/x-www-form-urlencoded";function gd(i){return typeof HTMLElement<"u"&&i instanceof HTMLElement}function g1(i){return gd(i)&&i.tagName.toLowerCase()==="button"}function x1(i){return gd(i)&&i.tagName.toLowerCase()==="form"}function v1(i){return gd(i)&&i.tagName.toLowerCase()==="input"}function _1(i){return!!(i.metaKey||i.altKey||i.ctrlKey||i.shiftKey)}function y1(i,e){return i.button===0&&(!e||e==="_self")&&!_1(i)}function mp(i=""){return new URLSearchParams(typeof i=="string"||Array.isArray(i)||i instanceof URLSearchParams?i:Object.keys(i).reduce((e,t)=>{let r=i[t];return e.concat(Array.isArray(r)?r.map(a=>[t,a]):[[t,r]])},[]))}function S1(i,e){let t=mp(i);return e&&e.forEach((r,a)=>{t.has(a)||e.getAll(a).forEach(l=>{t.append(a,l)})}),t}var hu=null;function M1(){if(hu===null)try{new FormData(document.createElement("form"),0),hu=!1}catch{hu=!0}return hu}var E1=new Set(["application/x-www-form-urlencoded","multipart/form-data","text/plain"]);function df(i){return i!=null&&!E1.has(i)?(Ui(!1,`"${i}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${ju}"`),null):i}function w1(i,e){let t,r,a,l,c;if(x1(i)){let d=i.getAttribute("action");r=d?qr(d,e):null,t=i.getAttribute("method")||Gu,a=df(i.getAttribute("enctype"))||ju,l=new FormData(i)}else if(g1(i)||v1(i)&&(i.type==="submit"||i.type==="image")){let d=i.form;if(d==null)throw new Error('Cannot submit a <button> or <input type="submit"> without a <form>');let h=i.getAttribute("formaction")||d.getAttribute("action");if(r=h?qr(h,e):null,t=i.getAttribute("formmethod")||d.getAttribute("method")||Gu,a=df(i.getAttribute("formenctype"))||df(d.getAttribute("enctype"))||ju,l=new FormData(d,i),!M1()){let{name:f,type:g,value:p}=i;if(g==="image"){let v=f?`${f}.`:"";l.append(`${v}x`,"0"),l.append(`${v}y`,"0")}else f&&l.append(f,p)}}else{if(gd(i))throw new Error('Cannot submit element that is not <form>, <button>, or <input type="submit|image">');t=Gu,r=null,a=ju,c=i}return l&&a==="text/plain"&&(c=l,l=void 0),{action:r,method:t.toLowerCase(),encType:a,formData:l,body:c}}Object.getOwnPropertyNames(Object.prototype).sort().join("\0");function Em(i,e){if(i===!1||i===null||typeof i>"u")throw new Error(e)}function W_(i,e,t,r){let a=typeof i=="string"?new URL(i,typeof window>"u"?"server://singlefetch/":window.location.origin):i;return t?a.pathname.endsWith("/")?a.pathname=`${a.pathname}_.${r}`:a.pathname=`${a.pathname}.${r}`:a.pathname==="/"?a.pathname=`_root.${r}`:e&&qr(a.pathname,e)==="/"?a.pathname=`${nd(e)}/_root.${r}`:a.pathname=`${nd(a.pathname)}.${r}`,a}async function b1(i,e){if(i.id in e)return e[i.id];try{let t=await import(i.module);return e[i.id]=t,t}catch(t){return console.error(`Error loading route module \`${i.module}\`, reloading page...`),console.error(t),window.__reactRouterContext&&window.__reactRouterContext.isSpaMode,window.location.reload(),new Promise(()=>{})}}function T1(i){return i==null?!1:i.href==null?i.rel==="preload"&&typeof i.imageSrcSet=="string"&&typeof i.imageSizes=="string":typeof i.rel=="string"&&typeof i.href=="string"}async function C1(i,e,t){let r=await Promise.all(i.map(async a=>{let l=e.routes[a.route.id];if(l){let c=await b1(l,t);return c.links?c.links():[]}return[]}));return N1(r.flat(1).filter(T1).filter(a=>a.rel==="stylesheet"||a.rel==="preload").map(a=>a.rel==="stylesheet"?{...a,rel:"prefetch",as:"style"}:{...a,rel:"prefetch"}))}function kx(i,e,t,r,a,l){let c=(h,f)=>t[f]?h.route.id!==t[f].route.id:!0,d=(h,f)=>{var g;return t[f].pathname!==h.pathname||((g=t[f].route.path)==null?void 0:g.endsWith("*"))&&t[f].params["*"]!==h.params["*"]};return l==="assets"?e.filter((h,f)=>c(h,f)||d(h,f)):l==="data"?e.filter((h,f)=>{var p;let g=r.routes[h.route.id];if(!g||!g.hasLoader)return!1;if(c(h,f)||d(h,f))return!0;if(h.route.shouldRevalidate){let v=h.route.shouldRevalidate({currentUrl:new URL(a.pathname+a.search+a.hash,window.origin),currentParams:((p=t[0])==null?void 0:p.params)||{},nextUrl:new URL(i,window.origin),nextParams:h.params,defaultShouldRevalidate:!0});if(typeof v=="boolean")return v}return!0}):[]}function R1(i,e,{includeHydrateFallback:t}={}){return A1(i.map(r=>{let a=e.routes[r.route.id];if(!a)return[];let l=[a.module];return a.clientActionModule&&(l=l.concat(a.clientActionModule)),a.clientLoaderModule&&(l=l.concat(a.clientLoaderModule)),t&&a.hydrateFallbackModule&&(l=l.concat(a.hydrateFallbackModule)),a.imports&&(l=l.concat(a.imports)),l}).flat(1))}function A1(i){return[...new Set(i)]}function P1(i){let e={},t=Object.keys(i).sort();for(let r of t)e[r]=i[r];return e}function N1(i,e){let t=new Set;return new Set(e),i.reduce((r,a)=>{let l=JSON.stringify(P1(a));return t.has(l)||(t.add(l),r.push({key:l,link:a})),r},[])}function wm(){let i=k.useContext(zo);return Em(i,"You must render this element inside a <DataRouterContext.Provider> element"),i}function L1(){let i=k.useContext(md);return Em(i,"You must render this element inside a <DataRouterStateContext.Provider> element"),i}var bm=k.createContext(void 0);bm.displayName="FrameworkContext";function xd(){let i=k.useContext(bm);return Em(i,"You must render this element inside a <HydratedRouter> element"),i}function D1(i,e){let t=k.useContext(bm),[r,a]=k.useState(!1),[l,c]=k.useState(!1),{onFocus:d,onBlur:h,onMouseEnter:f,onMouseLeave:g,onTouchStart:p}=e,v=k.useRef(null);k.useEffect(()=>{if(i==="render"&&c(!0),i==="viewport"){let b=S=>{S.forEach(P=>{c(P.isIntersecting)})},M=new IntersectionObserver(b,{threshold:.5});return v.current&&M.observe(v.current),()=>{M.disconnect()}}},[i]),k.useEffect(()=>{if(r){let b=setTimeout(()=>{c(!0)},100);return()=>{clearTimeout(b)}}},[r]);let _=()=>{a(!0)},E=()=>{a(!1),c(!1)};return t?i!=="intent"?[l,v,{}]:[l,v,{onFocus:Tl(d,_),onBlur:Tl(h,E),onMouseEnter:Tl(f,_),onMouseLeave:Tl(g,E),onTouchStart:Tl(p,_)}]:[!1,v,{}]}function Tl(i,e){return t=>{i&&i(t),t.defaultPrevented||e(t)}}function I1({page:i,...e}){let t=GE(),{nonce:r}=xd(),{router:a}=wm(),l=k.useMemo(()=>R_(a.routes,i,a.basename),[a.routes,i,a.basename]);return l?(e.nonce==null&&r&&(e={...e,nonce:r}),t?k.createElement(F1,{page:i,matches:l,...e}):k.createElement(O1,{page:i,matches:l,...e})):null}function U1(i){let{manifest:e,routeModules:t}=xd(),[r,a]=k.useState([]);return k.useEffect(()=>{let l=!1;return C1(i,e,t).then(c=>{l||a(c)}),()=>{l=!0}},[i,e,t]),r}function F1({page:i,matches:e,...t}){let r=Ji(),{future:a}=xd(),{basename:l}=wm(),c=k.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let d=W_(i,l,a.v8_trailingSlashAwareDataRequests,"rsc"),h=!1,f=[];for(let g of e)typeof g.route.shouldRevalidate=="function"?h=!0:f.push(g.route.id);return h&&f.length>0&&d.searchParams.set("_routes",f.join(",")),[d.pathname+d.search]},[l,a.v8_trailingSlashAwareDataRequests,i,r,e]);return k.createElement(k.Fragment,null,c.map(d=>k.createElement("link",{key:d,rel:"prefetch",as:"fetch",href:d,...t})))}function O1({page:i,matches:e,...t}){let r=Ji(),{future:a,manifest:l,routeModules:c}=xd(),{basename:d}=wm(),{loaderData:h,matches:f}=L1(),g=k.useMemo(()=>kx(i,e,f,l,r,"data"),[i,e,f,l,r]),p=k.useMemo(()=>kx(i,e,f,l,r,"assets"),[i,e,f,l,r]),v=k.useMemo(()=>{if(i===r.pathname+r.search+r.hash)return[];let b=new Set,M=!1;if(e.forEach(P=>{var C;let L=l.routes[P.route.id];!L||!L.hasLoader||(!g.some(I=>I.route.id===P.route.id)&&P.route.id in h&&((C=c[P.route.id])!=null&&C.shouldRevalidate)||L.hasClientLoader?M=!0:b.add(P.route.id))}),b.size===0)return[];let S=W_(i,d,a.v8_trailingSlashAwareDataRequests,"data");return M&&b.size>0&&S.searchParams.set("_routes",e.filter(P=>b.has(P.route.id)).map(P=>P.route.id).join(",")),[S.pathname+S.search]},[d,a.v8_trailingSlashAwareDataRequests,h,r,l,g,e,i,c]),_=k.useMemo(()=>R1(p,l),[p,l]),E=U1(p);return k.createElement(k.Fragment,null,v.map(b=>k.createElement("link",{key:b,rel:"prefetch",as:"fetch",href:b,...t})),_.map(b=>k.createElement("link",{key:b,rel:"modulepreload",href:b,...t})),E.map(({key:b,link:M})=>k.createElement("link",{key:b,nonce:t.nonce,...M,crossOrigin:M.crossOrigin??t.crossOrigin})))}function k1(...i){return e=>{i.forEach(t=>{typeof t=="function"?t(e):t!=null&&(t.current=e)})}}var z1=typeof window<"u"&&typeof window.document<"u"&&typeof window.document.createElement<"u";try{z1&&(window.__reactRouterVersion="7.18.0")}catch{}function B1({basename:i,children:e,useTransitions:t,window:r}){let a=k.useRef();a.current==null&&(a.current=mE({window:r,v5Compat:!0}));let l=a.current,[c,d]=k.useState({action:l.action,location:l.location}),h=k.useCallback(f=>{t===!1?d(f):k.startTransition(()=>d(f))},[t]);return k.useLayoutEffect(()=>l.listen(h),[l,h]),k.createElement(p1,{basename:i,children:e,location:c.location,navigationType:c.action,navigator:l,useTransitions:t})}var X_=k.forwardRef(function({onClick:e,discover:t="render",prefetch:r="none",relative:a,reloadDocument:l,replace:c,mask:d,state:h,target:f,to:g,preventScrollReset:p,viewTransition:v,defaultShouldRevalidate:_,...E},b){let{basename:M,navigator:S,useTransitions:P}=k.useContext(Ei),L=typeof g=="string"&&xm.test(g),C=U_(g,M);g=C.to;let I=YE(g,{relative:a}),N=Ji(),U=null;if(d){let $=pd(d,[],N.mask?N.mask.pathname:"/",!0);M!=="/"&&($.pathname=$.pathname==="/"?M:Yi([M,$.pathname])),U=S.createHref($)}let[w,D,z]=D1(r,E),H=G1(g,{replace:c,mask:d,state:h,target:f,preventScrollReset:p,relative:a,viewTransition:v,defaultShouldRevalidate:_,useTransitions:P});function X($){e&&e($),$.defaultPrevented||H($)}let j=!(C.isExternal||l),le=k.createElement("a",{...E,...z,href:(j?U:void 0)||C.absoluteURL||I,onClick:j?X:e,ref:k1(b,D),target:f,"data-discover":!L&&t==="render"?"true":void 0});return w&&!L?k.createElement(k.Fragment,null,le,k.createElement(I1,{page:I})):le});X_.displayName="Link";var po=k.forwardRef(function({"aria-current":e="page",caseSensitive:t=!1,className:r="",end:a=!1,style:l,to:c,viewTransition:d,children:h,...f},g){let p=tc(c,{relative:f.relative}),v=Ji(),_=k.useContext(md),{navigator:E,basename:b}=k.useContext(Ei),M=_!=null&&K1(p)&&d===!0,S=E.encodeLocation?E.encodeLocation(p).pathname:p.pathname,P=v.pathname,L=_&&_.navigation&&_.navigation.location?_.navigation.location.pathname:null;t||(P=P.toLowerCase(),L=L?L.toLowerCase():null,S=S.toLowerCase()),L&&b&&(L=qr(L,b)||L);const C=S!=="/"&&S.endsWith("/")?S.length-1:S.length;let I=P===S||!a&&P.startsWith(S)&&P.charAt(C)==="/",N=L!=null&&(L===S||!a&&L.startsWith(S)&&L.charAt(S.length)==="/"),U={isActive:I,isPending:N,isTransitioning:M},w=I?e:void 0,D;typeof r=="function"?D=r(U):D=[r,I?"active":null,N?"pending":null,M?"transitioning":null].filter(Boolean).join(" ");let z=typeof l=="function"?l(U):l;return k.createElement(X_,{...f,"aria-current":w,className:D,ref:g,style:z,to:c,viewTransition:d},typeof h=="function"?h(U):h)});po.displayName="NavLink";var H1=k.forwardRef(({discover:i="render",fetcherKey:e,navigate:t,reloadDocument:r,replace:a,state:l,method:c=Gu,action:d,onSubmit:h,relative:f,preventScrollReset:g,viewTransition:p,defaultShouldRevalidate:v,..._},E)=>{let{useTransitions:b}=k.useContext(Ei),M=$1(),S=q1(d,{relative:f}),P=c.toLowerCase()==="get"?"get":"post",L=typeof d=="string"&&xm.test(d),C=I=>{if(h&&h(I),I.defaultPrevented)return;I.preventDefault();let N=I.nativeEvent.submitter,U=(N==null?void 0:N.getAttribute("formmethod"))||c,w=()=>M(N||I.currentTarget,{fetcherKey:e,method:U,navigate:t,replace:a,state:l,relative:f,preventScrollReset:g,viewTransition:p,defaultShouldRevalidate:v});b&&t!==!1?k.startTransition(()=>w()):w()};return k.createElement("form",{ref:E,method:P,action:S,onSubmit:r?h:C,..._,"data-discover":!L&&i==="render"?"true":void 0})});H1.displayName="Form";function V1(i){return`${i} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`}function $_(i){let e=k.useContext(zo);return nn(e,V1(i)),e}function G1(i,{target:e,replace:t,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h,useTransitions:f}={}){let g=ym(),p=Ji(),v=tc(i,{relative:c});return k.useCallback(_=>{if(y1(_,e)){_.preventDefault();let E=t!==void 0?t:Gl(p)===Gl(v),b=()=>g(i,{replace:E,mask:r,state:a,preventScrollReset:l,relative:c,viewTransition:d,defaultShouldRevalidate:h});f?k.startTransition(()=>b()):b()}},[p,g,v,t,r,a,e,i,l,c,d,h,f])}function j1(i){Ui(typeof URLSearchParams<"u","You cannot use the `useSearchParams` hook in a browser that does not support the URLSearchParams API. If you need to support Internet Explorer 11, we recommend you load a polyfill such as https://github.com/ungap/url-search-params.");let e=k.useRef(mp(i)),t=k.useRef(!1),r=Ji(),a=k.useMemo(()=>S1(r.search,t.current?null:e.current),[r.search]),l=ym(),c=k.useCallback((d,h)=>{const f=mp(typeof d=="function"?d(new URLSearchParams(a)):d);t.current=!0,l("?"+f,h)},[l,a]);return[a,c]}var W1=0,X1=()=>`__${String(++W1)}__`;function $1(){let{router:i}=$_("useSubmit"),{basename:e}=k.useContext(Ei),t=c1(),r=i.fetch,a=i.navigate;return k.useCallback(async(l,c={})=>{let{action:d,method:h,encType:f,formData:g,body:p}=w1(l,e);if(c.navigate===!1){let v=c.fetcherKey||X1();await r(v,t,c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:g,body:p,formMethod:c.method||h,formEncType:c.encType||f,flushSync:c.flushSync})}else await a(c.action||d,{defaultShouldRevalidate:c.defaultShouldRevalidate,preventScrollReset:c.preventScrollReset,formData:g,body:p,formMethod:c.method||h,formEncType:c.encType||f,replace:c.replace,state:c.state,fromRouteId:t,flushSync:c.flushSync,viewTransition:c.viewTransition})},[r,a,e,t])}function q1(i,{relative:e}={}){let{basename:t}=k.useContext(Ei),r=k.useContext(Zi);nn(r,"useFormAction must be used inside a RouteContext");let[a]=r.matches.slice(-1),l={...tc(i||".",{relative:e})},c=Ji();if(i==null){l.search=c.search;let d=new URLSearchParams(l.search),h=d.getAll("index");if(h.some(g=>g==="")){d.delete("index"),h.filter(p=>p).forEach(p=>d.append("index",p));let g=d.toString();l.search=g?`?${g}`:""}}return(!i||i===".")&&a.route.index&&(l.search=l.search?l.search.replace(/^\?/,"?index&"):"?index"),t!=="/"&&(l.pathname=l.pathname==="/"?t:Yi([t,l.pathname])),Gl(l)}function K1(i,{relative:e}={}){let t=k.useContext(k_);nn(t!=null,"`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?");let{basename:r}=$_("useViewTransitionState"),a=tc(i,{relative:e});if(!t.isTransitioning)return!1;let l=qr(t.currentLocation.pathname,r)||t.currentLocation.pathname,c=qr(t.nextLocation.pathname,r)||t.nextLocation.pathname;return td(a.pathname,c)!=null||td(a.pathname,l)!=null}/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y1=i=>i.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),q_=(...i)=>i.filter((e,t,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===t).join(" ").trim();/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var Q1={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z1=k.forwardRef(({color:i="currentColor",size:e=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:l,iconNode:c,...d},h)=>k.createElement("svg",{ref:h,...Q1,width:e,height:e,stroke:i,strokeWidth:r?Number(t)*24/Number(e):t,className:q_("lucide",a),...d},[...c.map(([f,g])=>k.createElement(f,g)),...Array.isArray(l)?l:[l]]));/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _t=(i,e)=>{const t=k.forwardRef(({className:r,...a},l)=>k.createElement(Z1,{ref:l,iconNode:e,className:q_(`lucide-${Y1(i)}`,r),...a}));return t.displayName=`${i}`,t};/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J1=_t("ArchiveRestore",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h2",key:"tvwodi"}],["path",{d:"M20 8v11a2 2 0 0 1-2 2h-2",key:"1gkqxj"}],["path",{d:"m9 15 3-3 3 3",key:"1pd0qc"}],["path",{d:"M12 12v9",key:"192myk"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ew=_t("Archive",[["rect",{width:"20",height:"5",x:"2",y:"3",rx:"1",key:"1wp1u1"}],["path",{d:"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",key:"1s80jp"}],["path",{d:"M10 12h4",key:"a56b0p"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const tw=_t("ArrowRight",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"m12 5 7 7-7 7",key:"xquz4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const K_=_t("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const nw=_t("Boxes",[["path",{d:"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z",key:"lc1i9w"}],["path",{d:"m7 16.5-4.74-2.85",key:"1o9zyk"}],["path",{d:"m7 16.5 5-3",key:"va8pkn"}],["path",{d:"M7 16.5v5.17",key:"jnp8gn"}],["path",{d:"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z",key:"8zsnat"}],["path",{d:"m17 16.5-5-3",key:"8arw3v"}],["path",{d:"m17 16.5 4.74-2.85",key:"8rfmw"}],["path",{d:"M17 16.5v5.17",key:"k6z78m"}],["path",{d:"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z",key:"1xygjf"}],["path",{d:"M12 8 7.26 5.15",key:"1vbdud"}],["path",{d:"m12 8 4.74-2.85",key:"3rx089"}],["path",{d:"M12 13.5V8",key:"1io7kd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Y_=_t("Brush",[["path",{d:"m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08",key:"1styjt"}],["path",{d:"M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z",key:"z0l1mu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Lo=_t("Camera",[["path",{d:"M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z",key:"1tc9qg"}],["circle",{cx:"12",cy:"13",r:"3",key:"1vg3eu"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const iw=_t("ChartLine",[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"m19 9-5 5-4-4-3 3",key:"2osh9i"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const rw=_t("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sw=_t("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const aw=_t("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vd=_t("CircleCheck",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gp=_t("CircleSlash",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"9",x2:"15",y1:"15",y2:"9",key:"1dfufj"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ow=_t("Crosshair",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12",key:"l9bcsi"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12",key:"13hhkx"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2",key:"10w3f3"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18",key:"15g9kq"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const lw=_t("Crown",[["path",{d:"M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",key:"1vdc57"}],["path",{d:"M5 21h14",key:"11awu3"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const cw=_t("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const zx=_t("Eraser",[["path",{d:"m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21",key:"182aya"}],["path",{d:"M22 21H7",key:"t4ddhn"}],["path",{d:"m5 11 9 9",key:"1mo9qw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const uw=_t("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Bx=_t("Hammer",[["path",{d:"m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9",key:"eefl8a"}],["path",{d:"m18 15 4-4",key:"16gjal"}],["path",{d:"m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5",key:"b7pghm"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const dw=_t("Hand",[["path",{d:"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",key:"1fvzgz"}],["path",{d:"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",key:"1kc0my"}],["path",{d:"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",key:"10h0bg"}],["path",{d:"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",key:"1s1gnw"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const hw=_t("Image",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fw=_t("Images",[["path",{d:"M18 22H4a2 2 0 0 1-2-2V6",key:"pblm9e"}],["path",{d:"m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18",key:"nf6bnh"}],["circle",{cx:"12",cy:"8",r:"2",key:"1822b1"}],["rect",{width:"16",height:"16",x:"6",y:"2",rx:"2",key:"12espp"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ba=_t("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pw=_t("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Tm=_t("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const mw=_t("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const gw=_t("RotateCw",[["path",{d:"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",key:"1p45f6"}],["path",{d:"M21 3v5h-5",key:"1q7to0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Q_=_t("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z_=_t("ScanEye",[["path",{d:"M3 7V5a2 2 0 0 1 2-2h2",key:"aa7l1z"}],["path",{d:"M17 3h2a2 2 0 0 1 2 2v2",key:"4qcy5o"}],["path",{d:"M21 17v2a2 2 0 0 1-2 2h-2",key:"6vwrx8"}],["path",{d:"M7 21H5a2 2 0 0 1-2-2v-2",key:"ioqczr"}],["circle",{cx:"12",cy:"12",r:"1",key:"41hilf"}],["path",{d:"M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0",key:"11ak4c"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const J_=_t("Scissors",[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ey=_t("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xw=_t("SquarePen",[["path",{d:"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",key:"1m0v6g"}],["path",{d:"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",key:"ohrbg2"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const vw=_t("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ho=_t("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Cm=_t("TriangleAlert",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ty=_t("Undo2",[["path",{d:"M9 14 4 9l5-5",key:"102s5s"}],["path",{d:"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11",key:"f3b9sd"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ny=_t("Upload",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"17 8 12 3 7 8",key:"t8dd8p"}],["line",{x1:"12",x2:"12",y1:"3",y2:"15",key:"widbto"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xp=_t("WandSparkles",[["path",{d:"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72",key:"ul74o6"}],["path",{d:"m14 7 3 3",key:"1r5n42"}],["path",{d:"M5 6v4",key:"ilb8ba"}],["path",{d:"M19 14v4",key:"blhpug"}],["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M7 8H3",key:"zfb6yr"}],["path",{d:"M21 16h-4",key:"1cnmox"}],["path",{d:"M11 3H9",key:"1obp7u"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _w=_t("X",[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]]);async function qt(i,e){var r;const t=await fetch(i,e);if(!t.ok){let a="";try{a=((r=await t.json())==null?void 0:r.detail)??""}catch{}throw new Error(a||`HTTP ${t.status} (${i})`)}return t.json()}const Wt=(i,e)=>qt(i,{method:"POST",headers:{"Content-Type":"application/json"},body:e!==void 0?JSON.stringify(e):void 0}),jl=i=>qt(i,{method:"DELETE"}),id=["empty","wP","wN","wB","wR","wQ","wK","bP","bN","bB","bR","bQ","bK","occluded"],yw={K:"♚",Q:"♛",R:"♜",B:"♝",N:"♞",P:"♟"};function dr({label:i,className:e=""}){if(i==="empty")return x.jsx("span",{className:`text-zinc-500 ${e}`,children:"·"});if(i==="occluded")return x.jsx("span",{className:`text-amber-300 ${e}`,children:"▦"});const t=yw[i==null?void 0:i[1]]??i,r=(i==null?void 0:i[0])==="w";return x.jsx("span",{className:e,style:{color:r?"#fafafa":"#0a0a0a",textShadow:r?"0 0 1px #000, 0 1px 2px #000":"0 0 1px #fff, 0 1px 2px #fff"},children:t})}function Ht({title:i,right:e,children:t,className:r=""}){return x.jsxs("div",{className:`rounded-xl border border-zinc-800 bg-zinc-900 p-4 ${r}`,children:[(i||e)&&x.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[i&&x.jsx("h2",{className:"text-xs font-medium uppercase tracking-wide text-zinc-400",children:i}),e]}),t]})}function wt({children:i,variant:e="ghost",className:t="",onClick:r,disabled:a,...l}){const[c,d]=k.useState(!1),h=e==="primary"?"bg-sky-500 text-zinc-950 hover:bg-sky-400 font-medium":"bg-zinc-800 text-zinc-200 hover:bg-zinc-700";async function f(g){if(!r)return;const p=r(g);if(p&&typeof p.then=="function"){d(!0);try{await p}finally{d(!1)}}}return x.jsxs("button",{...l,onClick:f,disabled:a||c,className:`relative inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm transition
        disabled:cursor-not-allowed disabled:opacity-40 ${h} ${t}`,children:[x.jsx("span",{className:`inline-flex items-center gap-2 ${c?"invisible":""}`,children:i}),c&&x.jsx(ba,{className:"absolute h-4 w-4 animate-spin"})]})}function fr({label:i,children:e,...t}){return x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:[i,x.jsx("select",{...t,className:"rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",children:e})]})}function Sw(){const[i,e]=k.useState("default"),[t,r]=k.useState(800),[a,l]=k.useState(0),[c,d]=k.useState(.06),[h,f]=k.useState(!1),[g,p]=k.useState({markers_found:!1}),[v,_]=k.useState(""),[E,b]=k.useState(""),M=k.useRef(null);k.useEffect(()=>()=>{P()},[]);function S(){f(!0),clearInterval(M.current),M.current=setInterval(()=>qt("/api/camera/status").then(p).catch(()=>{}),1e3)}async function P(){f(!1),clearInterval(M.current);try{await Wt("/api/camera/release")}catch{}}function L(U){d(U),Wt("/api/calibrate/margin",{margin:U}).catch(()=>{})}async function C(){try{const U=await Wt("/api/calibrate/save",{profile:i,board_size:t,margin:c,camera:a});b(`Gespeichert: Profil „${U.profile}" (margin ${U.margin.toFixed(3)}) ✓`)}catch(U){b("Fehler: "+U.message)}}async function I(){const U=await Wt("/api/calibrate/markers");_(U.url+"?t="+Date.now())}const N="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";return x.jsxs("div",{className:"space-y-4",children:[x.jsx(Ht,{children:x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:i,onChange:U=>e(U.target.value),className:`${N} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:a,onChange:U=>l(+U.target.value),className:`${N} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Board px",x.jsx("input",{type:"number",value:t,onChange:U=>r(+U.target.value),className:`${N} w-24`})]}),h?x.jsxs(wt,{onClick:P,children:[x.jsx(gp,{className:"h-4 w-4"})," Stop"]}):x.jsxs(wt,{variant:"primary",onClick:S,children:[x.jsx(Lo,{className:"h-4 w-4"})," Kamera starten"]}),x.jsxs(wt,{onClick:I,children:[x.jsx(mw,{className:"h-4 w-4"})," Marker erzeugen"]})]})}),x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_300px]",children:[x.jsx(Ht,{title:"Live-Kamera",children:h?x.jsx("img",{src:`/api/camera/calibrate.mjpg?camera=${a}&board_size=${t}`,alt:"Kalibrierung Live-Bild",className:"w-full rounded-lg border border-zinc-800"}):x.jsx("div",{className:"flex h-72 items-center justify-center text-zinc-500",children:"Kamera nicht gestartet"})}),x.jsx(Ht,{title:"Spielfeld-Box justieren",children:x.jsxs("div",{className:"space-y-3",children:[g.markers_found?x.jsxs("span",{className:"flex items-center gap-1.5 text-green-500",children:[x.jsx(vd,{className:"h-4 w-4"})," ",g.markers_count,"/4 Marker erkannt",g.markers_held?` (${g.markers_held} gehalten)`:""]}):x.jsxs("span",{className:"flex items-center gap-1.5 text-amber-400",children:[x.jsx(gp,{className:"h-4 w-4"})," ",g.markers_count||0,"/4 Marker — alle 4 nötig (kurz die Hand wegnehmen)"]}),x.jsx("input",{type:"range",min:0,max:.2,step:.005,value:c,disabled:!h,onChange:U=>L(+U.target.value),className:"w-full accent-sky-500"}),x.jsxs("div",{className:"text-sm text-zinc-400",children:["margin = ",x.jsx("b",{className:"text-zinc-100 tabular-nums",children:c.toFixed(3)})]}),x.jsx("p",{className:"text-xs text-zinc-500",children:"🟧 Marker-Box außen · 🟩 grüne Box = Spielfeld. Schieber so einstellen, dass die grüne Box auf dem echten Karofeld liegt."}),x.jsxs(wt,{variant:"primary",onClick:C,disabled:!h||!g.markers_found,children:[x.jsx(Q_,{className:"h-4 w-4"})," Kalibrierung speichern"]}),x.jsx("div",{className:"text-xs text-zinc-500",children:E})]})})]}),v&&x.jsx(Ht,{title:"Marker-Blatt — drucken, an den Boxen schneiden, an die 4 Außenecken kleben",children:x.jsx("img",{src:v,alt:"Marker-Blatt",className:"max-w-md rounded-lg border border-zinc-800 bg-white p-2"})})]})}const hf="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function Mw({coverage:i,sweep:e,sets:t,setSets:r,count:a,setCount:l,passes:c,setPasses:d,pieces:h,setPieces:f,together:g,setTogether:p,offset:v,setOffset:_,autoOffset:E,setAutoOffset:b,maxPlies:M,setMaxPlies:S,input:P}){return i?x.jsxs(x.Fragment,{children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen kommen Damen/Könige doppelt so schnell zusammen.",children:["Sätze",x.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${P} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl dichter Aufbauten, die gegen deine schwächsten Klassen erzeugt werden.",children:["Aufbauten",x.jsx("input",{type:"number",min:1,value:a,onChange:L=>l(+L.target.value),className:`${P} w-20`})]})]}):e?x.jsxs(x.Fragment,{children:[x.jsxs("div",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Welche Figuren übers Brett wandern: special = Nicht-Bauern (K,Q,R,B,N), pawn = nur Bauern, all = alle.",children:["Figuren",x.jsxs(fr,{label:"",value:h,onChange:L=>f(L.target.value),children:[x.jsx("option",{value:"special",children:"special (K,Q,R,B,N)"}),x.jsx("option",{value:"pawn",children:"pawn (Bauern)"}),x.jsx("option",{value:"all",children:"all"})]})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Wiederholungen (je Pass 8 Fotos, Rang 1–8) — z.B. mit anderem Licht. Keine Figuren-Umstellung.",children:["Pässe",x.jsx("input",{type:"number",min:1,value:c,onChange:L=>d(+L.target.value),className:`${P} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Anzahl physischer Figurensätze: mit 2 Sätzen sind doppelt so viele Figuren je Foto möglich.",children:["Sätze",x.jsx("input",{type:"number",min:1,value:t,onChange:L=>r(+L.target.value),className:`${P} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Weiß und Schwarz gleichzeitig aufs Brett (Weiß vorne, Schwarz 4 Ränge versetzt) → halbe Fotozahl, jedes Feld bekommt beide Farben.",children:[x.jsx("input",{type:"checkbox",checked:g,onChange:L=>p(L.target.checked)})," beide Farben gleichzeitig"]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Offset automatisch: zählt bisherige Sweep-Sessions und nimmt den nächsten Offset → jede Figur landet über mehrere Sessions auf verschiedenen Linien (gegen Positions-Overfitting).",children:[x.jsx("input",{type:"checkbox",checked:E,onChange:L=>b(L.target.checked)})," Offset auto"]}),!E&&x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",title:"Verschiebt die Linien→Figur-Zuordnung, fix für diese Session. 0: a=König,b=Dame,…  1: a=Dame,b=Turm,…",children:["Offset",x.jsx("input",{type:"number",min:0,max:7,value:v,onChange:L=>_(+L.target.value),className:`${P} w-16`})]})]}):x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Halbzüge",x.jsx("input",{type:"number",value:M,onChange:L=>S(+L.target.value),className:`${P} w-20`})]})}function Ew(){const[i,e]=k.useState("random"),[t,r]=k.useState(40),[a,l]=k.useState(1),[c,d]=k.useState(20),[h,f]=k.useState(1),[g,p]=k.useState("special"),[v,_]=k.useState(!0),[E,b]=k.useState(0),[M,S]=k.useState(!0),[P,L]=k.useState("default"),[C,I]=k.useState(0),N=i==="coverage",U=i==="sweep",[w,D]=k.useState({active:!1}),[z,H]=k.useState(""),X=k.useRef(null);k.useEffect(()=>(qt("/api/collect/state").then(D).catch(()=>{}),()=>clearInterval(X.current)),[]);const j=()=>qt("/api/collect/state").then(D).catch(()=>{});async function le(){H("");try{const re=await Wt("/api/collect/start",{strategy:i,max_plies:t,profile:P,camera:C,sets:a,count:c,passes:h,pieces:g,together:v,offset:E,auto_offset:M});D(re),clearInterval(X.current),X.current=setInterval(j,1500)}catch(re){H("Fehler: "+re.message)}}const $=async()=>D(await Wt("/api/collect/shoot")),ue=async()=>D(await Wt("/api/collect/skip")),J=async()=>D(await Wt("/api/collect/undo"));async function K(){const re=await Wt("/api/collect/finish");clearInterval(X.current),D({active:!1}),H(`Session beendet: ${re.captures} Aufnahmen, ${re.sliced??0} Crops gesliced → Tab „Datensätze".`)}return x.jsxs("div",{className:"space-y-4",children:[x.jsx(Ht,{children:x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs(fr,{label:"Engine",value:i,onChange:re=>e(re.target.value),children:[x.jsx("option",{value:"random",children:"random (eingebaut)"}),x.jsx("option",{value:"stockfish",children:"stockfish (automatisch erkannt)"}),x.jsx("option",{value:"coverage",children:"coverage (gegen seltene Klassen)"}),x.jsx("option",{value:"sweep",children:"sweep (Figuren laufen übers Brett)"})]}),x.jsx(Mw,{coverage:N,sweep:U,input:hf,sets:a,setSets:l,count:c,setCount:d,passes:h,setPasses:f,pieces:g,setPieces:p,together:v,setTogether:_,offset:E,setOffset:b,autoOffset:M,setAutoOffset:S,maxPlies:t,setMaxPlies:r}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:P,onChange:re=>L(re.target.value),className:`${hf} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:C,onChange:re=>I(+re.target.value),className:`${hf} w-16`})]}),w.active?x.jsxs(wt,{onClick:K,children:[x.jsx(vd,{className:"h-4 w-4"})," Fertig"]}):x.jsxs(wt,{variant:"primary",onClick:le,children:[x.jsx(Tm,{className:"h-4 w-4"})," Partie starten"]}),x.jsx("span",{className:"text-xs text-zinc-500",children:z})]})}),w.active&&x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_320px]",children:[x.jsx(Ht,{title:"Live-Kamera",children:x.jsx("img",{src:"/api/camera/collect.mjpg",alt:"Aufnahme Live-Bild",className:"w-full rounded-lg border border-zinc-800"})}),x.jsx(Ht,{title:"Aufnahme",children:x.jsxs("div",{className:"space-y-3",children:[w.done?x.jsxs("div",{className:"font-medium text-green-500",children:["✓ Alle ",w.n_positions," Stellungen aufgenommen."]}):x.jsxs(x.Fragment,{children:[x.jsx(ww,{st:w}),x.jsxs("div",{className:"flex flex-wrap gap-2",children:[!w.done&&x.jsxs(wt,{variant:"primary",onClick:$,className:"px-5 py-2.5 text-base",children:[x.jsx(Lo,{className:"h-5 w-5"})," Foto"]}),!w.done&&x.jsxs(wt,{onClick:ue,children:[x.jsx(tw,{className:"h-4 w-4"})," Überspringen"]}),x.jsxs(wt,{onClick:J,children:[x.jsx(ty,{className:"h-4 w-4"})," Undo"]})]})]}),x.jsxs("div",{className:"text-sm",children:["Aufnahmen: ",x.jsx("b",{className:"text-sky-400",children:w.captures}),x.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Aufnahme ist ",x.jsx("b",{children:"sofort gespeichert"}),' — du kannst jederzeit „Fertig" (oben) drücken oder einfach aufhören; nichts geht verloren.']})]})})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:['Nach „Fertig" wird die Session automatisch gesliced. Kuratierte Datensätze (Dedup, Rotation, Split) baust du im Tab ',x.jsx("b",{className:"text-zinc-300",children:"Datensätze"}),"."]})]})}function ww({st:i}){const e=Math.min(i.index+1,i.n_positions),t=i.build_target?"Aufbau":"Stellung",r=i.build_target&&i.gains?x.jsxs("span",{className:"ml-1 text-xs text-zinc-500",children:["· ",i.gains," Ziel-Felder"]}):null;let a;i.build_target?a=x.jsxs(x.Fragment,{children:["Stellung ",x.jsx("b",{children:"frisch aufbauen"})," — die ",x.jsx("b",{className:"text-sky-300",children:"Figurennamen"})," sind ins Live-Bild eingeblendet (weiß = helle Schrift, schwarz = dunkle),"]}):i.index===0?a=x.jsxs(x.Fragment,{children:["Brett in die ",x.jsx("b",{children:"Startstellung"})," bringen,"]}):a=x.jsxs(x.Fragment,{children:["Diesen Zug ziehen: ",x.jsx("b",{className:"text-base text-sky-300",children:i.move_san})," ",x.jsx("span",{className:"text-zinc-400",children:"(roter Pfeil)"}),","]});const l=i.build_target?x.jsx(x.Fragment,{children:"(gern mehrere mit wechselndem Licht)"}):null;return x.jsxs(x.Fragment,{children:[x.jsxs("div",{className:"text-sm text-zinc-400",children:[t," ",x.jsx("b",{className:"text-zinc-100",children:e})," / ",i.n_positions,r]}),x.jsxs("div",{className:"rounded-lg bg-zinc-800 p-3 text-sm",children:[a,x.jsxs("div",{className:"mt-1 text-xs text-zinc-400",children:["…dann ",x.jsx("b",{children:"Foto"}),l,"."]})]})]})}const bw="abcdefgh".split(""),Tw=[8,7,6,5,4,3,2,1],Hx="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",iy={empty:"empty leer frei",occluded:"occluded verdeckt hand objekt verdeckung",wP:"white pawn weiss weißer bauer",wN:"white knight weiss weißer springer pferd",wB:"white bishop weiss weißer läufer",wR:"white rook weiss weißer turm",wQ:"white queen weiss weiße dame",wK:"white king weiss weißer könig",bP:"black pawn schwarz schwarzer bauer",bN:"black knight schwarz schwarzer springer pferd",bB:"black bishop schwarz schwarzer läufer",bR:"black rook schwarz schwarzer turm",bQ:"black queen schwarz schwarze dame",bK:"black king schwarz schwarzer könig"},Cw=(i,e)=>!e||i.toLowerCase().includes(e)||(iy[i]||"").includes(e);function Rw(){const[i,e]=k.useState("default"),[t,r]=k.useState(0),[a,l]=k.useState({active:!1}),[c,d]=k.useState({}),[h,f]=k.useState("wP"),[g,p]=k.useState(null),[v,_]=k.useState(""),[E,b]=k.useState(""),M=k.useRef(null);k.useEffect(()=>{qt("/api/manual/state").then(l).catch(()=>{})},[]);const S=Object.keys(c).length,P=id.filter(z=>Cw(z,v.trim().toLowerCase()));function L(z,H){return h?h===H?"empty":h:H??"empty"}function C(z,H){d(X=>{const j={...X};return H==="empty"?delete j[z]:j[z]=H,j}),p(null),_("")}function I(z,H){if(h){C(z,L(z,c[z]));return}const X=H.currentTarget.getBoundingClientRect();_(""),p({square:z,x:X.left,y:X.bottom+4})}async function N(){b("");try{l(await Wt("/api/manual/start",{profile:i,camera:t}))}catch(z){b("Fehler: "+z.message)}}async function U(){S===0&&!window.confirm("Keine Figur markiert — als komplett leeres Brett aufnehmen?")||l(await Wt("/api/manual/capture",{labels:c}))}const w=async()=>l(await Wt("/api/manual/undo"));async function D(){const z=await Wt("/api/manual/finish");l({active:!1}),d({}),b(`Session beendet: ${z.captures} Aufnahmen, ${z.sliced??0} Crops → Tab „Datensätze" / „Review".`)}return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(Ht,{children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:i,onChange:z=>e(z.target.value),className:`${Hx} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:t,onChange:z=>r(+z.target.value),className:`${Hx} w-16`})]}),a.active?x.jsxs(wt,{onClick:D,children:[x.jsx(vd,{className:"h-4 w-4"})," Fertig"]}):x.jsxs(wt,{variant:"primary",onClick:N,children:[x.jsx(Tm,{className:"h-4 w-4"})," Sitzung starten"]}),x.jsx("span",{className:"text-xs text-zinc-500",children:E})]}),x.jsxs("div",{className:"mt-3 flex flex-wrap items-center gap-1",children:[x.jsxs("span",{className:"mr-1 inline-flex items-center gap-1 text-xs text-zinc-500",children:[x.jsx(Y_,{className:"h-3.5 w-3.5"})," Pinsel:"]}),x.jsx("button",{onClick:()=>f(null),className:`rounded px-2 py-1 text-xs ${h===null?"bg-sky-600 text-white":"bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`,children:"aus (Suchfeld)"}),id.map(z=>x.jsx("button",{onClick:()=>f(H=>H===z?null:z),title:z,className:`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${h===z?"bg-sky-600 ring-2 ring-sky-300":"bg-zinc-800 hover:bg-zinc-700"}`,children:z==="empty"?x.jsx(zx,{className:"h-4 w-4 text-zinc-400"}):x.jsx(dr,{label:z})},z))]}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[a.active?h?`Pinsel „${h}" aktiv — Feld anklicken setzt (nochmal = leeren).`:"Feld anklicken → Suchfeld. ":"Starten, dann Figuren aufs reale Brett stellen und die belegten Felder markieren."," ","Nicht markierte Felder zählen als ",x.jsx("b",{children:"leer"}),'. Labels bleiben nach „Aufnehmen" erhalten → mehrere Frames mit wechselndem Licht.']})]}),a.active&&x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_300px]",children:[x.jsx(Ht,{title:"Live-Brett — Felder anklicken zum Labeln",children:x.jsxs("div",{ref:M,className:"relative mx-auto w-full max-w-[680px]",children:[x.jsx("img",{src:"/api/camera/manual.mjpg",alt:"Live-Brett manuelles Labeln",className:"block w-full rounded-lg border border-zinc-800"}),x.jsx("div",{className:"absolute inset-0 grid grid-cols-8",children:Tw.map(z=>bw.map(H=>{const X=H+z,j=c[X];return x.jsxs("button",{onClick:le=>I(X,le),className:`group relative flex items-center justify-center border border-transparent hover:border-sky-400/70 ${(g==null?void 0:g.square)===X?"border-sky-300":""}`,children:[j&&x.jsx("span",{className:"text-2xl drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]",children:x.jsx(dr,{label:j})}),x.jsx("span",{className:"pointer-events-none absolute left-0.5 top-0.5 hidden rounded bg-black/55 px-1 text-[9px] text-zinc-300 group-hover:block",children:X})]},X)}))})]})}),x.jsx(Ht,{title:"Aufnahme",children:x.jsxs("div",{className:"space-y-3",children:[x.jsxs("div",{className:"text-sm text-zinc-400",children:["Markiert: ",x.jsx("b",{className:"text-sky-400",children:S})," Figur(en)"]}),x.jsxs("div",{className:"text-sm",children:["Aufnahmen: ",x.jsx("b",{className:"text-sky-400",children:a.captures??0}),x.jsx("span",{className:"ml-1 text-xs text-green-500",children:"· sofort gespeichert ✓"})]}),x.jsxs("div",{className:"flex flex-wrap gap-2",children:[x.jsxs(wt,{variant:"primary",onClick:U,className:"px-5 py-2.5 text-base",children:[x.jsx(Lo,{className:"h-5 w-5"})," Aufnehmen"]}),x.jsxs(wt,{onClick:()=>d({}),children:[x.jsx(zx,{className:"h-4 w-4"})," Alles leeren"]}),x.jsxs(wt,{onClick:w,children:[x.jsx(ty,{className:"h-4 w-4"})," Undo"]})]}),x.jsxs("p",{className:"text-xs text-zinc-500",children:["Jede Aufnahme ist ",x.jsx("b",{children:"sofort gespeichert"}),' und wird nach „Fertig" automatisch gesliced. Feinkorrektur (z. B. ',x.jsx("b",{children:"occluded"}),") im Tab ",x.jsx("b",{children:"Review"}),"."]})]})})]}),g&&x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"fixed inset-0 z-40",role:"presentation",onClick:()=>{p(null),_("")}}),x.jsxs("div",{className:"fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl",style:{left:Math.min(g.x,window.innerWidth-240),top:Math.min(g.y,window.innerHeight-320)},children:[x.jsxs("div",{className:"mb-1 text-xs text-zinc-400",children:["Feld ",x.jsx("b",{className:"text-zinc-200",children:g.square})]}),x.jsxs("div",{className:"mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2",children:[x.jsx(ey,{className:"h-3.5 w-3.5 text-zinc-500"}),x.jsx("input",{value:v,onChange:z=>_(z.target.value),onKeyDown:z=>{z.key==="Enter"&&P[0]&&C(g.square,P[0]),z.key==="Escape"&&(p(null),_(""))},placeholder:"suchen: könig, bN, leer…",className:"w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none"})]}),x.jsx("div",{className:"max-h-56 overflow-auto",children:P.length===0?x.jsx("div",{className:"px-2 py-1.5 text-xs text-zinc-500",children:"nichts gefunden"}):P.map(z=>x.jsxs("button",{onClick:()=>C(g.square,z),className:`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${c[g.square]===z||z==="empty"&&!c[g.square]?"bg-zinc-800 text-sky-300":"text-zinc-200"}`,children:[x.jsx("span",{className:"w-5 text-center text-lg",children:z==="empty"?"·":x.jsx(dr,{label:z})}),x.jsx("span",{className:"font-mono text-xs text-zinc-400",children:z}),x.jsx("span",{className:"ml-auto text-[11px] text-zinc-500",children:(iy[z]||"").split(" ").slice(2,4).join(" ")})]},z))})]})]})]})}const ho="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500",ff=({isActive:i})=>`rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function Aw(){return x.jsxs("div",{className:"space-y-4",children:[x.jsxs("nav",{className:"flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5",children:[x.jsx(po,{to:"sessions",className:ff,children:"Sessions"}),x.jsx(po,{to:"kuratiert",className:ff,children:"Kuratierte Datensätze"}),x.jsx(po,{to:"statistik",className:ff,children:"Statistik"})]}),x.jsx(f1,{})]})}const ry=()=>{const i=fd();return(...e)=>e.forEach(t=>i.invalidateQueries({queryKey:[t]}))};function Pw(){const i=ry(),[e,t]=k.useState(""),a=gr({queryKey:["sessions-manage"],queryFn:()=>qt("/api/sessions/manage")}).data??[],l=p=>{t(p),i("sessions-manage","stats","datasets")},c=p=>t("Fehler: "+p.message),d=Gr({mutationFn:p=>Wt(`/api/sessions/${p}/slice`),onSuccess:p=>l(`„${p.session}" gesliced: ${p.crops} Crops.`),onError:c}),h=Gr({mutationFn:p=>Wt(`/api/sessions/${p}/archive`),onSuccess:()=>l("archiviert."),onError:c}),f=Gr({mutationFn:p=>Wt(`/api/sessions/${p}/restore`),onSuccess:()=>l("wiederhergestellt — neu slicen."),onError:c}),g=Gr({mutationFn:p=>jl(`/api/sessions/${p}`),onSuccess:()=>l("gelöscht."),onError:c});return x.jsx(Ht,{title:"Sessions (Rohmaterial)",right:x.jsxs("span",{className:"text-xs text-zinc-500",children:[a.length," Session(s) · ",e]}),children:a.length===0?x.jsx("span",{className:"text-sm text-zinc-500",children:'Noch keine Sessions — im Tab „Sammeln" aufnehmen.'}):x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Session"}),x.jsx("th",{className:"text-left font-normal",children:"Modus"}),x.jsx("th",{className:"text-right font-normal",children:"Frames"}),x.jsx("th",{className:"text-right font-normal",children:"Crops"}),x.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),x.jsx("tbody",{children:a.map(p=>x.jsxs("tr",{className:"border-t border-zinc-800",children:[x.jsxs("td",{className:"py-1.5 text-zinc-200",children:[p.session_id,p.archived&&x.jsx("span",{className:"ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300",children:"archiviert"}),!p.archived&&p.n_crops===0&&x.jsx("span",{className:"ml-2 rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] text-amber-300",children:"nicht gesliced"})]}),x.jsx("td",{className:"text-zinc-400",children:p.mode??"—"}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:p.n_frames}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:p.archived?"—":p.n_crops}),x.jsx("td",{className:"py-1",children:x.jsxs("div",{className:"flex justify-end gap-1.5",children:[!p.archived&&x.jsxs(wt,{onClick:()=>d.mutate(p.session_id),className:"px-2 py-1 text-xs",children:[x.jsx(J_,{className:"h-3.5 w-3.5"})," ",p.n_crops?"Neu slicen":"Slicen"]}),p.archived?x.jsxs(wt,{onClick:()=>f.mutate(p.session_id),className:"px-2 py-1 text-xs",children:[x.jsx(J1,{className:"h-3.5 w-3.5"})," Wiederherstellen"]}):x.jsxs(wt,{onClick:()=>h.mutate(p.session_id),className:"px-2 py-1 text-xs",children:[x.jsx(ew,{className:"h-3.5 w-3.5"})," Archivieren"]}),x.jsxs(wt,{onClick:()=>window.confirm(`Session „${p.session_id}" endgültig löschen?`)&&g.mutate(p.session_id),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[x.jsx(Ho,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},p.session_id))})]})})}function Nw(){const i=ry(),[e,t]=k.useState(""),[r,a]=k.useState(!1),[l,c]=k.useState(""),[d,h]=k.useState({}),[f,g]=k.useState(4),[p,v]=k.useState(!0),[_,E]=k.useState(6),[b,M]=k.useState(!0),[S,P]=k.useState(.15),[L,C]=k.useState(.15),I=gr({queryKey:["sessions-manage"],queryFn:()=>qt("/api/sessions/manage")}),N=gr({queryKey:["datasets"],queryFn:()=>qt("/api/datasets")}),U=(I.data??[]).filter(j=>!j.archived),w=N.data??[],D=Gr({mutationFn:j=>Wt("/api/datasets",j),onSuccess:j=>{t(`„${j.name}" gebaut: roh ${j.counts.raw} → dedup ${j.counts.after_dedup} → final ${j.counts.final}.`),a(!1),c(""),h({}),i("datasets","stats")},onError:j=>t("Fehler: "+j.message)}),z=Gr({mutationFn:j=>jl(`/api/datasets/${j}`),onSuccess:()=>{t("gelöscht."),i("datasets")}}),H=Gr({mutationFn:j=>Wt(`/api/datasets/${j}/rebuild`),onSuccess:j=>{var le;t(`„${j.name}" neu gebaut: ${(le=j.counts)==null?void 0:le.final} Crops.`),i("datasets","stats")},onError:j=>t("Fehler: "+j.message)});function X(){const j=U.filter(le=>d[le.session_id]).map(le=>le.session_id);if(!l.trim()||j.length===0){t("Name und mind. eine Session wählen.");return}D.mutate({name:l.trim(),session_ids:j,per_cell_cap:f,phash_enabled:p,phash_hamming:_,rotate:b,val_frac:S,test_frac:L})}return x.jsxs(Ht,{title:"Kuratierte Datensätze",right:x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsx("span",{className:"text-xs text-zinc-500",children:e}),x.jsxs(wt,{onClick:()=>a(j=>!j),className:"px-2 py-1 text-xs",children:[x.jsx(nw,{className:"h-3.5 w-3.5"})," Neuer Datensatz"]})]}),children:[r&&x.jsxs("div",{className:"mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3",children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Name",x.jsx("input",{value:l,onChange:j=>c(j.target.value),className:`${ho} w-40`,placeholder:"z.B. set-a"})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"max. Crops je (Session, Feld, Figur)",children:["Cap/Feld",x.jsx("input",{type:"number",min:1,value:f,onChange:j=>g(+j.target.value),className:`${ho} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:[x.jsx("input",{type:"checkbox",checked:p,onChange:j=>v(j.target.checked)})," pHash"]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["Hamming",x.jsx("input",{type:"number",min:0,max:32,value:_,disabled:!p,onChange:j=>E(+j.target.value),className:`${ho} w-14`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",title:"90/180/270° → 4× Crops. ACHTUNG: widerspricht der Fixkamera-Annahme — A/B testen.",children:[x.jsx("input",{type:"checkbox",checked:b,onChange:j=>M(j.target.checked)})," ",x.jsx(gw,{className:"h-3.5 w-3.5"})," Rotation"]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["val",x.jsx("input",{type:"number",step:.05,min:0,max:.5,value:S,onChange:j=>P(+j.target.value),className:`${ho} w-14`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["test",x.jsx("input",{type:"number",step:.05,min:0,max:.5,value:L,onChange:j=>C(+j.target.value),className:`${ho} w-14`})]})]}),x.jsxs("div",{children:[x.jsx("div",{className:"mb-1 text-xs text-zinc-500",children:"Sessions (Teilmenge frei wählbar — Datensätze dürfen sich überschneiden):"}),x.jsx("div",{className:"flex flex-wrap gap-2",children:U.length===0?x.jsx("span",{className:"text-xs text-zinc-500",children:"keine aktiven Sessions"}):U.map(j=>x.jsxs("label",{className:"flex items-center gap-1.5 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300",children:[x.jsx("input",{type:"checkbox",checked:!!d[j.session_id],onChange:le=>h($=>({...$,[j.session_id]:le.target.checked}))}),j.session_id," ",x.jsxs("span",{className:"text-zinc-500",children:["(",j.n_crops,")"]})]},j.session_id))})]}),x.jsxs(wt,{variant:"primary",onClick:X,disabled:D.isPending,children:[x.jsx(Bx,{className:"h-4 w-4"})," ",D.isPending?"Baue…":"Bauen"]})]}),w.length===0?x.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Datensatz gebaut."}):x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),x.jsx("th",{className:"text-right font-normal",children:"Sessions"}),x.jsx("th",{className:"text-right font-normal",children:"roh→dedup→final"}),x.jsx("th",{className:"text-right font-normal",children:"train/val/test"}),x.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),x.jsx("tbody",{children:w.map(j=>{var le,$,ue,J,K,re,de;return x.jsxs("tr",{className:"border-t border-zinc-800",children:[x.jsxs("td",{className:"py-1.5 text-zinc-200",children:[j.name,((le=j.rotations)==null?void 0:le.some(F=>F))&&x.jsx("span",{className:"ml-2 text-[10px] text-zinc-500",children:"+rot"})]}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:j.n_sessions}),x.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[($=j.counts)==null?void 0:$.raw,"→",(ue=j.counts)==null?void 0:ue.after_dedup,"→",(J=j.counts)==null?void 0:J.final]}),x.jsxs("td",{className:"text-right tabular-nums text-zinc-400",children:[((K=j.split_counts)==null?void 0:K.train)??"?","/",((re=j.split_counts)==null?void 0:re.val)??"?","/",((de=j.split_counts)==null?void 0:de.test)??"?"]}),x.jsx("td",{className:"py-1",children:x.jsxs("div",{className:"flex justify-end gap-1.5",children:[x.jsx(po,{to:`../statistik?ds=${encodeURIComponent(j.name)}`,className:"inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700",children:"Stats"}),x.jsxs(wt,{onClick:()=>H.mutate(j.name),className:"px-2 py-1 text-xs",children:[x.jsx(Bx,{className:"h-3.5 w-3.5"})," Neu bauen"]}),x.jsxs(wt,{onClick:()=>window.confirm(`Datensatz „${j.name}" löschen?`)&&z.mutate(j.name),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[x.jsx(Ho,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},j.name)})})]})]})}function Lw(){const[i,e]=j1(),t=i.get("ds")??"",[r,a]=k.useState(null),l=gr({queryKey:["datasets"],queryFn:()=>qt("/api/datasets")}),c=gr({queryKey:["stats",t],queryFn:()=>{const _=t?`?dataset=${encodeURIComponent(t)}`:"";return qt(`/api/stats${_}`)}}),d=l.data??[],h=c.data;if(c.isLoading||!h)return x.jsx(Ht,{children:"Stats laden…"});const f=t?`Datensatz „${t}"`:"globaler Pool",g=Math.max(1,...Object.values(h.counts??{x:1})),p=(_,E)=>_==="empty"||_==="occluded"?"#38bdf8":E<h.min_samples*.5?"#ef4444":E<h.min_samples?"#eab308":"#22c55e",v=_=>{const E=t?`&dataset=${encodeURIComponent(t)}`:"";return qt(`/api/class/${_}?limit=120${E}`).then(b=>a({label:_,crops:b.crops}))};return x.jsxs("div",{className:"space-y-4",children:[x.jsxs("div",{className:"grid gap-4 lg:grid-cols-3",children:[x.jsxs(Ht,{title:"Klassenverteilung",className:"lg:col-span-2",right:x.jsxs("select",{value:t,onChange:_=>e(_.target.value?{ds:_.target.value}:{}),className:ho,children:[x.jsx("option",{value:"",children:"globaler Pool"}),d.map(_=>x.jsx("option",{value:_.name,children:_.name},_.name))]}),children:[x.jsxs("div",{className:"mb-2 text-xs text-zinc-500",children:[h.total," Crops · ",h.num_sessions," Sessions",t?` · Datensatz „${t}"`:" · roh"]}),x.jsx("div",{className:"space-y-1.5",children:h.classes.map(_=>{const E=h.counts[_]||0;return x.jsxs("button",{onClick:()=>v(_),className:"grid w-full grid-cols-[2rem_1fr_3rem] items-center gap-3 rounded px-1 py-0.5 text-left hover:bg-zinc-800",children:[x.jsxs("span",{className:"text-zinc-300",children:[x.jsx(dr,{label:_}),x.jsx("span",{className:"ml-1 text-xs text-zinc-500",children:_})]}),x.jsx("div",{className:"h-2.5 overflow-hidden rounded-full bg-zinc-800",children:x.jsx("div",{className:"h-full rounded-full",style:{width:`${E/g*100}%`,background:p(_,E)}})}),x.jsx("span",{className:"text-right text-sm tabular-nums text-zinc-400",children:E})]},_)})})]}),x.jsx(Ht,{title:"Hell / Dunkel",children:x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Klasse"}),x.jsx("th",{children:"hell"}),x.jsx("th",{children:"dunkel"})]})}),x.jsx("tbody",{children:h.classes.map(_=>{const E=b=>b>0?x.jsx(rw,{className:"mx-auto h-4 w-4 text-green-500"}):x.jsx(_w,{className:"mx-auto h-4 w-4 text-red-500"});return x.jsxs("tr",{className:"border-t border-zinc-800",children:[x.jsxs("td",{className:"py-1 text-zinc-300",children:[x.jsx(dr,{label:_})," ",x.jsx("span",{className:"text-xs text-zinc-500",children:_})]}),x.jsx("td",{children:E(h.light[_]||0)}),x.jsx("td",{children:E(h.dark[_]||0)})]},_)})})]})})]}),x.jsx(Ht,{title:"Warnungen",children:h.warnings.length?x.jsx("ul",{className:"space-y-1 text-sm",children:h.warnings.map((_,E)=>x.jsxs("li",{className:"flex items-center gap-2 text-amber-400",children:[x.jsx(Cm,{className:"h-4 w-4 shrink-0"})," ",_]},E))}):x.jsx("span",{className:"text-sm text-green-500",children:"keine"})}),x.jsx(Ht,{title:`Crops durchblättern (${f})`,right:x.jsxs("span",{className:"flex items-center gap-1 text-xs text-zinc-500",children:[x.jsx(fw,{className:"h-3.5 w-3.5"}),r?`${r.label} (${r.crops.length})`:"Klasse anklicken"]}),children:r?x.jsx("div",{className:"grid grid-cols-[repeat(auto-fill,56px)] gap-1.5",children:r.crops.map((_,E)=>x.jsx("img",{src:_.url,title:`${_.session_id} ${_.frame} ${_.square}`,alt:`Feld ${_.square}`,className:"h-[74px] w-[56px] rounded border border-zinc-800 object-cover"},E))}):x.jsx("span",{className:"text-sm text-zinc-500",children:"Wähle links eine Klasse, um die Crops zu sehen."})})]})}const Dw="abcdefgh".split(""),sy={empty:"empty leer frei",occluded:"occluded verdeckt hand objekt verdeckung",wP:"white pawn weiss weißer bauer",wN:"white knight weiss weißer springer pferd",wB:"white bishop weiss weißer läufer",wR:"white rook weiss weißer turm",wQ:"white queen weiss weiße dame",wK:"white king weiss weißer könig",bP:"black pawn schwarz schwarzer bauer",bN:"black knight schwarz schwarzer springer pferd",bB:"black bishop schwarz schwarzer läufer",bR:"black rook schwarz schwarzer turm",bQ:"black queen schwarz schwarze dame",bK:"black king schwarz schwarzer könig"},Iw=(i,e)=>!e||i.toLowerCase().includes(e)||(sy[i]||"").includes(e);function Uw(){var Ge;const i=fd(),[e,t]=k.useState(""),[r,a]=k.useState(""),[l,c]=k.useState(""),[d,h]=k.useState({}),[f,g]=k.useState(null),[p,v]=k.useState(null),[_,E]=k.useState(""),[b,M]=k.useState(""),[S,P]=k.useState(0),[L,C]=k.useState(0),I=gr({queryKey:["sessions"],queryFn:()=>qt("/api/sessions")}),N=gr({queryKey:["runs"],queryFn:()=>qt("/api/runs")}),U=I.data??[],w=N.data??[],D=((Ge=U.find(V=>V.session_id===e))==null?void 0:Ge.frames)??[],z=D.indexOf(r);k.useEffect(()=>{U.length&&(!e||!U.some(V=>V.session_id===e))&&(t(U[0].session_id),a(U[0].frames[0]??""))},[U]),k.useEffect(()=>{D.length&&!D.includes(r)&&a(D[0])},[e,D.join(",")]),k.useEffect(()=>{w.length&&!l&&c(w[w.length-1].run)},[w]);const H=gr({queryKey:["review",e,r,l],queryFn:()=>qt(`/api/review?session=${e}&frame=${r}&run=${l}`),enabled:!!e&&!!r,retry:!1});k.useEffect(()=>{h({}),v(null)},[e,r]);const X=H.data,j={};((X==null?void 0:X.cells)??[]).forEach(V=>j[V.square]=V);const le=Object.keys(d).length,$=V=>d[V.square]??V.label;function ue(V,xe){var ne;const fe=(ne=j[V])==null?void 0:ne.label;h(Le=>{const qe={...Le};return xe===fe?delete qe[V]:qe[V]=xe,qe}),v(null),E("")}function J(V,xe){if(f){ue(V,f);return}const fe=xe.currentTarget.getBoundingClientRect();E(""),v({square:V,x:fe.left,y:fe.bottom+4})}function K(){X!=null&&X.cells&&(h(V=>{const xe={...V};for(const fe of X.cells)fe.pred_label&&fe.pred_label!==fe.label&&(xe[fe.square]=fe.pred_label);return xe}),M("Modell-Vorschläge übernommen — prüfen & speichern."))}function re(V){D.length&&a(D[Math.min(D.length-1,Math.max(0,(z<0?0:z)+V))])}k.useEffect(()=>{const V=xe=>{xe.target instanceof HTMLInputElement||xe.target instanceof HTMLSelectElement||(xe.key==="ArrowLeft"&&re(-1),xe.key==="ArrowRight"&&re(1),xe.key==="Escape"&&g(null))};return window.addEventListener("keydown",V),()=>window.removeEventListener("keydown",V)},[D.join(","),z]);const de=Gr({mutationFn:()=>Wt("/api/corrections",Object.entries(d).map(([V,xe])=>({session_id:e,frame:r,square:V,label:xe}))),onSuccess:V=>{M(`${V.applied} Korrekturen gespeichert. „Slicen" übernimmt sie.`),h({})},onError:V=>M("Fehler: "+V.message)}),F=Gr({mutationFn:()=>Wt(`/api/reslice?session=${e}&pad_up=${S}&pad_side=${L}`),onSuccess:V=>{M(`Neu gesliced ✓ (${V.crops??"?"} Crops).`),i.invalidateQueries({queryKey:["review"]}),i.invalidateQueries({queryKey:["sessions"]})},onError:V=>M("Slicing fehlgeschlagen: "+V.message)}),ee="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-sm text-zinc-100",Ce=p?j[p.square]:null,Ve=id.filter(V=>Iw(V,_.trim().toLowerCase()));return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(Ht,{children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsx(fr,{label:"Session",value:e,onChange:V=>t(V.target.value),children:U.map(V=>x.jsxs("option",{value:V.session_id,children:[V.session_id," (",V.n_frames,")"]},V.session_id))}),x.jsxs("div",{className:"flex items-center gap-1",children:[x.jsx(wt,{onClick:()=>re(-1),disabled:z<=0,className:"px-2 py-1.5",children:x.jsx(sw,{className:"h-4 w-4"})}),x.jsx(fr,{label:"Frame",value:r,onChange:V=>a(V.target.value),children:D.map(V=>x.jsx("option",{children:V},V))}),x.jsx(wt,{onClick:()=>re(1),disabled:z<0||z>=D.length-1,className:"px-2 py-1.5",children:x.jsx(aw,{className:"h-4 w-4"})}),x.jsx("span",{className:"ml-1 text-xs tabular-nums text-zinc-500",children:D.length?`${z+1} / ${D.length}`:"0 / 0"})]}),x.jsxs(fr,{label:"Modell",value:l,onChange:V=>c(V.target.value),children:[x.jsx("option",{value:"",children:"(kein Modell)"}),w.map(V=>x.jsx("option",{value:V.run,children:V.run},V.run))]}),l&&x.jsxs(wt,{onClick:K,children:[x.jsx(xp,{className:"h-4 w-4"})," Vorschläge übernehmen"]}),x.jsxs(wt,{variant:"primary",onClick:()=>de.mutate(),disabled:le===0||de.isPending,children:[x.jsx(Q_,{className:"h-4 w-4"})," Speichern (",le,")"]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["pad_up",x.jsx("input",{type:"number",step:.05,min:0,value:S,onChange:V=>P(+V.target.value),className:`${ee} w-16`})]}),x.jsxs("label",{className:"flex items-center gap-1 text-xs text-zinc-400",children:["pad_side",x.jsx("input",{type:"number",step:.02,min:0,value:L,onChange:V=>C(+V.target.value),className:`${ee} w-16`})]}),x.jsxs(wt,{onClick:()=>F.mutate(),disabled:!e||F.isPending,children:[x.jsx(J_,{className:"h-4 w-4"})," Slicen"]})]}),x.jsxs("div",{className:"mt-3 flex flex-wrap items-center gap-1",children:[x.jsxs("span",{className:"mr-1 inline-flex items-center gap-1 text-xs text-zinc-500",children:[x.jsx(Y_,{className:"h-3.5 w-3.5"})," Pinsel:"]}),x.jsx("button",{onClick:()=>g(null),className:`rounded px-2 py-1 text-xs ${f===null?"bg-sky-600 text-white":"bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`,children:"aus (Suchfeld)"}),id.map(V=>x.jsx("button",{onClick:()=>g(xe=>xe===V?null:V),title:V,className:`flex h-8 w-8 items-center justify-center rounded text-xl leading-none ${f===V?"bg-sky-600 ring-2 ring-sky-300":"bg-zinc-800 hover:bg-zinc-700"}`,children:x.jsx(dr,{label:V})},V))]}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[b||(H.isError?"keine Crops für diese Session/Frame (erst slicen?)":f?`Pinsel „${f}" aktiv — Felder anklicken setzt direkt (Esc = aus).`:"Pinsel wählen zum schnellen Malen, oder Feld anklicken → Suchfeld · ◀▶/Pfeiltasten steppen."),!b&&!H.isError&&x.jsxs(x.Fragment,{children:[" ",x.jsx("span",{className:"text-red-400",children:"Rot"}),"=Modell widerspricht · ",x.jsx("span",{className:"text-amber-400",children:"Gelb"}),"=unsicher · ",x.jsx("span",{className:"text-sky-400",children:"Blau"}),"=geändert."]})]})]}),X&&x.jsxs(Ht,{title:`Brett — ${e} / ${r}`,children:[x.jsx("div",{className:"grid w-full max-w-[920px] grid-cols-8 gap-1",children:[8,7,6,5,4,3,2,1].map(V=>Dw.map(xe=>{const fe=j[xe+V];if(!fe)return x.jsx("div",{},xe+V);const Le=fe.square in d?"ring-sky-400":fe.disagree?"ring-red-500":fe.confidence!=null&&fe.confidence<.6?"ring-amber-400":"ring-zinc-700";return x.jsxs("button",{onClick:qe=>J(fe.square,qe),className:`relative aspect-square overflow-hidden rounded-md bg-black ring-2 ${Le} ${(p==null?void 0:p.square)===fe.square?"ring-sky-300":""} hover:ring-sky-300`,children:[x.jsx("img",{src:fe.url,alt:`Feld ${fe.square}`,className:"h-full w-full object-cover"}),x.jsx("span",{className:"absolute left-0.5 top-0.5 rounded bg-black/55 px-1 text-[9px] text-zinc-400",children:xe+V}),fe.pred_label&&x.jsxs("span",{className:"absolute right-0 top-0 inline-flex items-center gap-0.5 rounded-bl bg-black/60 px-1 text-[10px] text-zinc-300",children:[x.jsx(dr,{label:fe.pred_label})," ",Math.round((fe.confidence||0)*100),"%"]}),x.jsx("span",{className:"absolute inset-x-0 bottom-0 bg-black/65 py-0.5 text-center text-lg font-bold",children:x.jsx(dr,{label:$(fe)})})]},xe+V)}))}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:[le," geändert · Klasse je Feld per Suchfeld setzen."]})]}),p&&Ce&&x.jsxs(x.Fragment,{children:[x.jsx("div",{className:"fixed inset-0 z-40",role:"presentation",onClick:()=>{v(null),E("")}}),x.jsxs("div",{className:"fixed z-50 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl",style:{left:Math.min(p.x,window.innerWidth-240),top:Math.min(p.y,window.innerHeight-320)},children:[x.jsxs("div",{className:"mb-1 flex items-center justify-between text-xs text-zinc-400",children:[x.jsxs("span",{children:["Feld ",x.jsx("b",{className:"text-zinc-200",children:p.square})]}),Ce.pred_label&&x.jsxs("button",{onClick:()=>ue(p.square,Ce.pred_label),className:"inline-flex items-center gap-1 text-sky-400 hover:underline",children:["Vorschlag ",x.jsx(dr,{label:Ce.pred_label})," ",Math.round((Ce.confidence||0)*100),"%"]})]}),x.jsxs("div",{className:"mb-1 flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2",children:[x.jsx(ey,{className:"h-3.5 w-3.5 text-zinc-500"}),x.jsx("input",{value:_,onChange:V=>E(V.target.value),onKeyDown:V=>{V.key==="Enter"&&Ve[0]&&ue(p.square,Ve[0]),V.key==="Escape"&&(v(null),E(""))},placeholder:"suchen: könig, bN, leer…",className:"w-full bg-transparent py-1.5 text-sm text-zinc-100 outline-none"})]}),x.jsx("div",{className:"max-h-56 overflow-auto",children:Ve.length===0?x.jsx("div",{className:"px-2 py-1.5 text-xs text-zinc-500",children:"nichts gefunden"}):Ve.map(V=>x.jsxs("button",{onClick:()=>ue(p.square,V),className:`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-800 ${$(Ce)===V?"bg-zinc-800 text-sky-300":"text-zinc-200"}`,children:[x.jsx("span",{className:"w-5 text-center text-lg",children:x.jsx(dr,{label:V})}),x.jsx("span",{className:"font-mono text-xs text-zinc-400",children:V}),x.jsx("span",{className:"ml-auto text-[11px] text-zinc-500",children:(sy[V]||"").split(" ").slice(2,4).join(" ")})]},V))})]})]})]})}function Vx({series:i,yMin:e=0,yMax:t=1}){const c=i.flatMap(p=>p.data.map(v=>v.x)),d=Math.max(1,...c),h=p=>30+540*p/d,f=p=>170-140*(p-e)/Math.max(1e-9,t-e),g=4;return x.jsxs("div",{children:[x.jsxs("svg",{viewBox:"0 0 600 200",className:"w-full",style:{height:200},preserveAspectRatio:"none",children:[Array.from({length:g+1},(p,v)=>{const _=e+(t-e)*v/g;return x.jsxs("g",{children:[x.jsx("line",{x1:30,y1:f(_),x2:570,y2:f(_),stroke:"#27272a",strokeWidth:1}),x.jsx("text",{x:4,y:f(_)+3,fill:"#71717a",fontSize:10,children:_.toFixed(t<=1?2:1)})]},v)}),i.map(p=>p.data.length?x.jsx("polyline",{fill:"none",stroke:p.color,strokeWidth:2,strokeLinejoin:"round",points:p.data.map(v=>`${h(v.x).toFixed(1)},${f(v.y).toFixed(1)}`).join(" ")},p.name):null)]}),x.jsx("div",{className:"mt-1 flex flex-wrap gap-4 text-xs text-zinc-400",children:i.map(p=>x.jsxs("span",{className:"flex items-center gap-1.5",children:[x.jsx("span",{className:"inline-block h-2 w-2 rounded-full",style:{background:p.color}}),p.name]},p.name))})]})}const fu="w-20 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100";function Fw(){var V,xe,fe;const[i,e]=k.useState([]),[t,r]=k.useState(""),[a,l]=k.useState(""),[c,d]=k.useState([]),[h,f]=k.useState({}),[g,p]=k.useState({running:!1}),[v,_]=k.useState(""),[E,b]=k.useState("smallcnn"),[M,S]=k.useState("combined"),[P,L]=k.useState(30),[C,I]=k.useState(256),[N,U]=k.useState(3e-4),[w,D]=k.useState(7),[z,H]=k.useState(""),X=k.useRef(null),le=gr({queryKey:["datasets"],queryFn:()=>qt("/api/datasets")}).data??[],$=le.find(ne=>ne.name===a);k.useEffect(()=>{le.length&&!a&&l(le[0].name)},[le]);const ue=k.useCallback(async()=>{const ne=await qt("/api/runs");e(ne),ne.length&&!t&&J(ne[0].run)},[t]);k.useEffect(()=>(ue(),()=>clearInterval(X.current)),[ue]);async function J(ne){r(ne),d((await qt(`/api/runs/${ne}/metrics`)).metrics),f((await qt(`/api/runs/${ne}/eval`)).evals)}async function K(ne){if(window.confirm(`Modell „${ne}" löschen? (Verzeichnis + Gewichte werden entfernt)`)){try{await jl(`/api/runs/${ne}`)}catch(Le){_(Le.message);return}t===ne&&(r(""),d([]),f({})),ue()}}const re=ne=>ne==null?"—":(ne*100).toFixed(1)+" %";async function de(){if(_(""),!a){_("Kein Datensatz — erst im Tab Datensätze einen bauen.");return}try{await Wt("/api/train",{backbone:E,head:M,epochs:P,batch_size:C,lr:N,patience:w,no_amp:!0,dataset:a,resume:z||void 0}),clearInterval(X.current),X.current=setInterval(F,2500),F()}catch(ne){_(ne.message)}}async function F(){var Le;const ne=await qt("/api/train/status");p(ne),(Le=ne.metrics)!=null&&Le.length&&d(ne.metrics),ne.running||(clearInterval(X.current),ue())}async function ee(){var ne;try{await Wt("/api/train/stop")}catch{}clearInterval(X.current);try{const Le=await qt("/api/train/status");p({...Le,running:!1}),Le.run&&r(Le.run),(ne=Le.metrics)!=null&&ne.length&&d(Le.metrics)}catch{p({running:!1,state:"stopped"})}ue()}const Ce=[{name:"train_loss",color:"#ef4444",data:c.map(ne=>({x:ne.epoch,y:ne.train_loss}))},{name:"val_loss",color:"#eab308",data:c.map(ne=>({x:ne.epoch,y:ne.val_loss??0}))}],Ve=Math.max(.5,...c.map(ne=>Math.max(ne.train_loss||0,ne.val_loss||0))),Ge=[{name:"square_acc",color:"#38bdf8",data:c.map(ne=>({x:ne.epoch,y:ne.val_acc??0}))},{name:"macro_recall",color:"#22c55e",data:c.map(ne=>({x:ne.epoch,y:ne.val_macro_recall??0}))},{name:"board_acc",color:"#e4e4e7",data:c.map(ne=>({x:ne.epoch,y:ne.val_board_acc??0}))}];return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(Ht,{children:[x.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[x.jsxs(fr,{label:"Datensatz",value:a,onChange:ne=>l(ne.target.value),children:[le.length===0&&x.jsx("option",{value:"",children:"— keiner gebaut —"}),le.map(ne=>{var Le;return x.jsxs("option",{value:ne.name,children:[ne.name," (",((Le=ne.counts)==null?void 0:Le.final)??"?",")"]},ne.name)})]}),x.jsxs(fr,{label:"Backbone",value:E,onChange:ne=>b(ne.target.value),children:[x.jsx("option",{value:"smallcnn",children:"smallcnn"}),x.jsx("option",{value:"mobilenet_v3_small",children:"mobilenet_v3_small"})]}),x.jsxs(fr,{label:"Kopf",value:M,onChange:ne=>S(ne.target.value),children:[x.jsx("option",{value:"combined",children:"combined"}),x.jsx("option",{value:"factored",children:"factored"}),x.jsx("option",{value:"twostage",children:"twostage (Occ→Piece)"})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Epochs",x.jsx("input",{type:"number",min:1,value:P,onChange:ne=>L(+ne.target.value),className:fu})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["Batch",x.jsx("input",{type:"number",min:1,value:C,onChange:ne=>I(+ne.target.value),className:fu})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",children:["LR",x.jsx("input",{type:"number",step:1e-4,min:0,value:N,onChange:ne=>U(+ne.target.value),className:fu})]}),x.jsxs("label",{className:"flex flex-col text-xs text-zinc-400",title:"Early Stopping: Epochen ohne macro_recall-Fortschritt, bevor abgebrochen wird.",children:["Geduld",x.jsx("input",{type:"number",min:1,value:w,onChange:ne=>D(+ne.target.value),className:fu})]}),x.jsxs(fr,{label:"Weiter ab",value:z,onChange:ne=>H(ne.target.value),children:[x.jsx("option",{value:"",children:"von Grund auf"}),i.some(ne=>String(ne.dataset||"").startsWith("pretrain-"))&&x.jsx("optgroup",{label:"Basis-Modelle (vortrainiert)",children:i.filter(ne=>String(ne.dataset||"").startsWith("pretrain-")).map(ne=>x.jsxs("option",{value:ne.run,children:["🔹 Basis · ",ne.run]},ne.run))}),x.jsx("optgroup",{label:"Eigene Runs",children:i.filter(ne=>!String(ne.dataset||"").startsWith("pretrain-")).map(ne=>x.jsx("option",{value:ne.run,children:ne.run},ne.run))})]}),x.jsxs(wt,{variant:"primary",onClick:de,disabled:g.running||!a,children:[g.running?x.jsx(ba,{className:"h-4 w-4 animate-spin"}):x.jsx(Tm,{className:"h-4 w-4"})," Training starten"]}),g.running&&x.jsxs(wt,{onClick:ee,children:[x.jsx(vw,{className:"h-4 w-4"})," Abbrechen"]})]}),$&&x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Split: train ",((V=$.split_counts)==null?void 0:V.train)??"?"," · val ",((xe=$.split_counts)==null?void 0:xe.val)??"?"," · test ",((fe=$.split_counts)==null?void 0:fe.test)??"?"]}),(g.running||c.length>0)&&x.jsxs("div",{className:"mt-3",children:[x.jsxs("div",{className:"mb-1 flex justify-between text-xs text-zinc-400",children:[x.jsxs("span",{children:[g.running?`läuft… (${g.run})`:g.state==="stopped"||g.state==="crashed"?"abgebrochen":"Fortschritt"," · Epoche ",c.length,"/",P]}),x.jsxs("span",{children:["board_acc ",c.length?((c[c.length-1].val_board_acc??0)*100).toFixed(1)+" %":"—"]})]}),x.jsx("div",{className:"h-2 overflow-hidden rounded-full bg-zinc-800",children:x.jsx("div",{className:`h-full rounded-full transition-all ${g.state==="stopped"||g.state==="crashed"?"bg-amber-500":"bg-sky-500"}`,style:{width:`${Math.min(100,c.length/Math.max(1,P)*100)}%`}})})]}),!g.running&&g.state==="done"&&x.jsx("p",{className:"mt-2 text-xs text-green-500",children:"fertig ✓"}),!g.running&&(g.state==="stopped"||g.state==="crashed")&&x.jsxs("p",{className:"mt-2 text-xs text-amber-400",children:[g.state==="crashed"?"abgebrochen (Crash)":"abgebrochen"," bei Epoche ",c.length,' — Teil-Fortschritt bleibt erhalten; „best.pt" ist gespeichert, „Weiter ab" setzt hier an.']}),v&&x.jsx("p",{className:"mt-2 text-sm text-amber-400",children:v})]}),x.jsxs(Ht,{title:"Modelle",right:x.jsxs("span",{className:"text-xs text-zinc-500",children:[i.length," Run(s)"]}),children:[i.length===0?x.jsx("span",{className:"text-sm text-zinc-500",children:"Noch kein Modell trainiert."}):x.jsx("div",{className:"overflow-x-auto",children:x.jsxs("table",{className:"w-full text-sm",children:[x.jsx("thead",{children:x.jsxs("tr",{className:"text-zinc-500",children:[x.jsx("th",{className:"text-left font-normal",children:"Run"}),x.jsx("th",{className:"text-left font-normal",children:"Backbone"}),x.jsx("th",{className:"text-left font-normal",children:"Datensatz"}),x.jsx("th",{className:"text-right font-normal",children:"Kl."}),x.jsx("th",{className:"text-right font-normal",children:"Ep."}),x.jsx("th",{className:"text-right font-normal",title:"bestes val board_acc (alle 64 Felder korrekt)",children:"board_acc"}),x.jsx("th",{className:"text-right font-normal",title:"bestes val square_acc (Anteil korrekter Einzelfelder — treibt board_acc ≈ square_acc^64)",children:"square_acc"}),x.jsx("th",{className:"text-right font-normal",title:"bestes val macro_recall",children:"macro_rec"}),x.jsx("th",{className:"text-right font-normal",title:"Test-Set board_acc (nach eval)",children:"test"}),x.jsx("th",{className:"text-right font-normal",children:"Aktion"})]})}),x.jsx("tbody",{children:i.map(ne=>x.jsxs("tr",{className:`border-t border-zinc-800 ${t===ne.run?"bg-zinc-800/50":""}`,children:[x.jsxs("td",{className:"py-1.5 text-zinc-200",children:[ne.run,ne.resumed_from&&x.jsx("span",{className:"ml-1 text-[10px] text-zinc-500",title:`weiter ab ${ne.resumed_from}`,children:"↻"}),ne.has_occluded&&x.jsx("span",{className:"ml-1 rounded bg-zinc-700 px-1 text-[9px] text-amber-300",children:"+occ"})]}),x.jsx("td",{className:"text-zinc-400",children:ne.backbone}),x.jsx("td",{className:"text-zinc-400",children:ne.dataset??"—"}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:ne.n_classes}),x.jsx("td",{className:"text-right tabular-nums text-zinc-400",children:ne.epochs_done}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(ne.best_board_acc)}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(ne.best_square_acc)}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(ne.best_macro_recall)}),x.jsx("td",{className:"text-right tabular-nums text-zinc-300",children:re(ne.test_board_acc)}),x.jsx("td",{className:"py-1",children:x.jsxs("div",{className:"flex justify-end gap-1.5",children:[x.jsxs(wt,{onClick:()=>J(ne.run),className:"px-2 py-1 text-xs",children:[x.jsx(uw,{className:"h-3.5 w-3.5"})," Anzeigen"]}),x.jsxs(wt,{onClick:()=>K(ne.run),className:"px-2 py-1 text-xs text-red-300 hover:text-red-200",children:[x.jsx(Ho,{className:"h-3.5 w-3.5"})," Löschen"]})]})})]},ne.run))})]})}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:['„Anzeigen" lädt Kurven & Eval unten · „test" erscheint nach ',x.jsx("code",{children:"chesslab eval --run …"}),' · ↻ = weiter-trainiert · +occ = Modell kennt die Klasse „verdeckt".']})]}),x.jsxs("div",{className:"grid gap-4 lg:grid-cols-2",children:[x.jsx(Ht,{title:"Loss",children:x.jsx(Vx,{series:Ce,yMin:0,yMax:Ve})}),x.jsx(Ht,{title:"Metriken (0–1) — macro_recall ist die ehrliche Zahl",children:x.jsx(Vx,{series:Ge,yMin:0,yMax:1})})]}),x.jsx(Ht,{title:"Evaluation",children:Object.keys(h).length?x.jsx("div",{className:"space-y-4",children:Object.entries(h).map(([ne,Le])=>{const qe=Object.entries(Le.recall||{}).sort((Vt,dt)=>Vt[1]-dt[1]).slice(0,3);return x.jsxs("div",{children:[x.jsxs("div",{className:"text-sm",children:[x.jsx("span",{className:"font-medium uppercase text-zinc-400",children:ne})," · board_acc ",x.jsxs("b",{children:[(Le.board_acc*100).toFixed(1),"%"]})," · square_acc ",(Le.square_acc*100).toFixed(1),"%"]}),x.jsxs("div",{className:"text-xs text-zinc-500",children:["schwächste Klassen: ",qe.map(([Vt,dt])=>`${Vt} ${(dt*100).toFixed(0)}%`).join(", ")]}),Le.confusion_png&&x.jsx("img",{src:Le.confusion_png,alt:"Confusion Matrix",className:"mt-2 max-w-md rounded-lg border border-zinc-800"})]},ne)})}):x.jsxs("span",{className:"text-sm text-zinc-500",children:["Noch keine eval — ",x.jsx("code",{children:"chesslab eval --run …"})]})}),g.log_tail&&x.jsx(Ht,{title:"Log",children:x.jsx("pre",{className:"max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400",children:g.log_tail})})]})}const Gx="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500";function Ow(){const e=gr({queryKey:["runs"],queryFn:()=>qt("/api/runs")}).data??[],[t,r]=k.useState(""),[a,l]=k.useState("default"),[c,d]=k.useState(0),[h,f]=k.useState(!1),[g,p]=k.useState({}),[v,_]=k.useState(""),E=k.useRef(null);k.useEffect(()=>{e.length&&!t&&r(e[e.length-1].run)},[e]),k.useEffect(()=>()=>{clearInterval(E.current),h&&Wt("/api/camera/release").catch(()=>{})},[]);async function b(){_("");try{await Wt("/api/inference/start",{run:t,profile:a,camera:c}),f(!0),clearInterval(E.current),E.current=setInterval(()=>qt("/api/inference/state").then(p).catch(()=>{}),1e3)}catch(P){_("Fehler: "+P.message)}}async function M(){f(!1),clearInterval(E.current);try{await Wt("/api/camera/release")}catch{}}async function S(){try{const P=await Wt("/api/inference/capture");_(`Snapshot gespeichert: ${P.crops} Crops (Session ${P.session}). ${P.hint}`)}catch(P){_("Fehler: "+P.message)}}return x.jsxs("div",{className:"space-y-4",children:[x.jsxs(Ht,{children:[x.jsxs("div",{className:"flex flex-wrap items-center gap-3",children:[x.jsxs(fr,{label:"Modell",value:t,onChange:P=>r(P.target.value),children:[e.length===0&&x.jsx("option",{value:"",children:"— kein Modell trainiert —"}),e.map(P=>x.jsx("option",{value:P.run,children:P.run},P.run))]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Profil",x.jsx("input",{value:a,onChange:P=>l(P.target.value),className:`${Gx} w-28`})]}),x.jsxs("label",{className:"flex items-center gap-2 text-sm text-zinc-400",children:["Kamera",x.jsx("input",{type:"number",value:c,onChange:P=>d(+P.target.value),className:`${Gx} w-16`})]}),h?x.jsxs(wt,{onClick:M,children:[x.jsx(gp,{className:"h-4 w-4"})," Stop"]}):x.jsxs(wt,{variant:"primary",onClick:b,disabled:!t,children:[x.jsx(Z_,{className:"h-4 w-4"})," Auswertung starten"]}),h&&x.jsxs(wt,{variant:"primary",onClick:S,children:[x.jsx(Lo,{className:"h-4 w-4"})," Snapshot als Trainingsdaten"]})]}),x.jsxs("p",{className:"mt-2 text-xs text-zinc-500",children:["Figuren aufs Brett stellen — das Modell wertet jedes Feld live aus (Glyph + Farbe = Confidence:",x.jsx("span",{className:"text-green-500",children:" grün"})," hoch · ",x.jsx("span",{className:"text-amber-400",children:"gelb"})," mittel ·",x.jsx("span",{className:"text-red-400",children:" rot"}),' niedrig). „Snapshot" speichert die Stellung als neue Session (Active Learning) — danach im ',x.jsx("b",{className:"text-zinc-300",children:"Review"})," Fehler & verdeckte Felder korrigieren, bevor du darauf neu trainierst."]}),v&&x.jsx("p",{className:"mt-1 text-xs text-sky-400",children:v})]}),x.jsxs("div",{className:"grid gap-4 lg:grid-cols-[1fr_280px]",children:[x.jsx(Ht,{title:"Live-Auswertung",children:h?x.jsx("img",{src:"/api/camera/inference.mjpg",alt:"Live-Inferenz",className:"w-full rounded-lg border border-zinc-800"}):x.jsxs("div",{className:"flex h-72 items-center justify-center text-zinc-500",children:[x.jsx(Lo,{className:"mr-2 h-5 w-5"})," Auswertung nicht gestartet"]})}),x.jsx(Ht,{title:"Erkannte Stellung",children:h?x.jsxs("div",{className:"space-y-2 text-sm",children:[x.jsxs("div",{className:"text-zinc-400",children:["Ø Confidence: ",x.jsx("b",{className:"text-zinc-100 tabular-nums",children:g.mean_conf!=null?(g.mean_conf*100).toFixed(0)+" %":"—"})]}),x.jsx("div",{className:"text-zinc-400",children:"FEN (geschätzt):"}),x.jsx("code",{className:"block break-all rounded bg-zinc-950 p-2 text-xs text-zinc-300",children:g.fen??"…"}),x.jsx("p",{className:"text-xs text-zinc-500",children:"verdeckte Felder zählen in der FEN als leer."})]}):x.jsx("span",{className:"text-sm text-zinc-500",children:"Start drücken."})})]})]})}/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Rm="185",mo={ROTATE:0,DOLLY:1,PAN:2},fo={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},kw=0,jx=1,zw=2,Wu=1,Bw=2,Fl=3,Os=0,hi=1,hr=2,Wr=0,go=1,Wx=2,Xx=3,$x=4,Hw=5,la=100,Vw=101,Gw=102,jw=103,Ww=104,Xw=200,$w=201,qw=202,Kw=203,vp=204,_p=205,Yw=206,Qw=207,Zw=208,Jw=209,eb=210,tb=211,nb=212,ib=213,rb=214,yp=0,Sp=1,Mp=2,Do=3,Ep=4,wp=5,bp=6,Tp=7,Am=0,sb=1,ab=2,xr=0,ay=1,oy=2,ly=3,Pm=4,cy=5,uy=6,dy=7,hy=300,Ea=301,Io=302,pf=303,mf=304,_d=306,Cp=1e3,jr=1001,Rp=1002,Un=1003,ob=1004,pu=1005,jn=1006,gf=1007,da=1008,Si=1009,fy=1010,py=1011,Wl=1012,Nm=1013,yr=1014,pr=1015,Kr=1016,Lm=1017,Dm=1018,Xl=1020,my=35902,gy=35899,xy=1021,vy=1022,Ki=1023,Yr=1026,ha=1027,_y=1028,Im=1029,wa=1030,Um=1031,Fm=1033,Xu=33776,$u=33777,qu=33778,Ku=33779,Ap=35840,Pp=35841,Np=35842,Lp=35843,Dp=36196,Ip=37492,Up=37496,Fp=37488,Op=37489,rd=37490,kp=37491,zp=37808,Bp=37809,Hp=37810,Vp=37811,Gp=37812,jp=37813,Wp=37814,Xp=37815,$p=37816,qp=37817,Kp=37818,Yp=37819,Qp=37820,Zp=37821,Jp=36492,em=36494,tm=36495,nm=36283,im=36284,sd=36285,rm=36286,lb=3200,ad=0,cb=1,bs="",Jn="srgb",od="srgb-linear",ld="linear",Bt="srgb",Ya=7680,qx=519,ub=512,db=513,hb=514,Om=515,fb=516,pb=517,km=518,mb=519,Kx=35044,Yx="300 es",mr=2e3,$l=2001;function gb(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function ql(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function xb(){const i=ql("canvas");return i.style.display="block",i}const Qx={};function Zx(...i){const e="THREE."+i.shift();console.log(e,...i)}function yy(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function ot(...i){i=yy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Pt(...i){i=yy(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function xo(...i){const e=i.join(" ");e in Qx||(Qx[e]=!0,ot(...i))}function vb(i,e,t){return new Promise(function(r,a){function l(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:a();break;case i.TIMEOUT_EXPIRED:setTimeout(l,t);break;default:r()}}setTimeout(l,t)})}const _b={[yp]:Sp,[Mp]:bp,[Ep]:Tp,[Do]:wp,[Sp]:yp,[bp]:Mp,[Tp]:Ep,[wp]:Do};class zs{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const r=this._listeners;r[e]===void 0&&(r[e]=[]),r[e].indexOf(t)===-1&&r[e].push(t)}hasEventListener(e,t){const r=this._listeners;return r===void 0?!1:r[e]!==void 0&&r[e].indexOf(t)!==-1}removeEventListener(e,t){const r=this._listeners;if(r===void 0)return;const a=r[e];if(a!==void 0){const l=a.indexOf(t);l!==-1&&a.splice(l,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const r=t[e.type];if(r!==void 0){e.target=this;const a=r.slice(0);for(let l=0,c=a.length;l<c;l++)a[l].call(this,e);e.target=null}}}const Hn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Yu=Math.PI/180,sm=180/Math.PI;function nc(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(Hn[i&255]+Hn[i>>8&255]+Hn[i>>16&255]+Hn[i>>24&255]+"-"+Hn[e&255]+Hn[e>>8&255]+"-"+Hn[e>>16&15|64]+Hn[e>>24&255]+"-"+Hn[t&63|128]+Hn[t>>8&255]+"-"+Hn[t>>16&255]+Hn[t>>24&255]+Hn[r&255]+Hn[r>>8&255]+Hn[r>>16&255]+Hn[r>>24&255]).toLowerCase()}function Mt(i,e,t){return Math.max(e,Math.min(t,i))}function yb(i,e){return(i%e+e)%e}function xf(i,e,t){return(1-t)*i+t*e}function Cl(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function li(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}const Sb={DEG2RAD:Yu},jm=class jm{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,r=this.y,a=e.elements;return this.x=a[0]*t+a[3]*r+a[6],this.y=a[1]*t+a[4]*r+a[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Mt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y;return t*t+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const r=Math.cos(t),a=Math.sin(t),l=this.x-e.x,c=this.y-e.y;return this.x=l*r-c*a+e.x,this.y=l*a+c*r+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};jm.prototype.isVector2=!0;let ut=jm;class ks{constructor(e=0,t=0,r=0,a=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=r,this._w=a}static slerpFlat(e,t,r,a,l,c,d){let h=r[a+0],f=r[a+1],g=r[a+2],p=r[a+3],v=l[c+0],_=l[c+1],E=l[c+2],b=l[c+3];if(p!==b||h!==v||f!==_||g!==E){let M=h*v+f*_+g*E+p*b;M<0&&(v=-v,_=-_,E=-E,b=-b,M=-M);let S=1-d;if(M<.9995){const P=Math.acos(M),L=Math.sin(P);S=Math.sin(S*P)/L,d=Math.sin(d*P)/L,h=h*S+v*d,f=f*S+_*d,g=g*S+E*d,p=p*S+b*d}else{h=h*S+v*d,f=f*S+_*d,g=g*S+E*d,p=p*S+b*d;const P=1/Math.sqrt(h*h+f*f+g*g+p*p);h*=P,f*=P,g*=P,p*=P}}e[t]=h,e[t+1]=f,e[t+2]=g,e[t+3]=p}static multiplyQuaternionsFlat(e,t,r,a,l,c){const d=r[a],h=r[a+1],f=r[a+2],g=r[a+3],p=l[c],v=l[c+1],_=l[c+2],E=l[c+3];return e[t]=d*E+g*p+h*_-f*v,e[t+1]=h*E+g*v+f*p-d*_,e[t+2]=f*E+g*_+d*v-h*p,e[t+3]=g*E-d*p-h*v-f*_,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,r,a){return this._x=e,this._y=t,this._z=r,this._w=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const r=e._x,a=e._y,l=e._z,c=e._order,d=Math.cos,h=Math.sin,f=d(r/2),g=d(a/2),p=d(l/2),v=h(r/2),_=h(a/2),E=h(l/2);switch(c){case"XYZ":this._x=v*g*p+f*_*E,this._y=f*_*p-v*g*E,this._z=f*g*E+v*_*p,this._w=f*g*p-v*_*E;break;case"YXZ":this._x=v*g*p+f*_*E,this._y=f*_*p-v*g*E,this._z=f*g*E-v*_*p,this._w=f*g*p+v*_*E;break;case"ZXY":this._x=v*g*p-f*_*E,this._y=f*_*p+v*g*E,this._z=f*g*E+v*_*p,this._w=f*g*p-v*_*E;break;case"ZYX":this._x=v*g*p-f*_*E,this._y=f*_*p+v*g*E,this._z=f*g*E-v*_*p,this._w=f*g*p+v*_*E;break;case"YZX":this._x=v*g*p+f*_*E,this._y=f*_*p+v*g*E,this._z=f*g*E-v*_*p,this._w=f*g*p-v*_*E;break;case"XZY":this._x=v*g*p-f*_*E,this._y=f*_*p-v*g*E,this._z=f*g*E+v*_*p,this._w=f*g*p+v*_*E;break;default:ot("Quaternion: .setFromEuler() encountered an unknown order: "+c)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const r=t/2,a=Math.sin(r);return this._x=e.x*a,this._y=e.y*a,this._z=e.z*a,this._w=Math.cos(r),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,r=t[0],a=t[4],l=t[8],c=t[1],d=t[5],h=t[9],f=t[2],g=t[6],p=t[10],v=r+d+p;if(v>0){const _=.5/Math.sqrt(v+1);this._w=.25/_,this._x=(g-h)*_,this._y=(l-f)*_,this._z=(c-a)*_}else if(r>d&&r>p){const _=2*Math.sqrt(1+r-d-p);this._w=(g-h)/_,this._x=.25*_,this._y=(a+c)/_,this._z=(l+f)/_}else if(d>p){const _=2*Math.sqrt(1+d-r-p);this._w=(l-f)/_,this._x=(a+c)/_,this._y=.25*_,this._z=(h+g)/_}else{const _=2*Math.sqrt(1+p-r-d);this._w=(c-a)/_,this._x=(l+f)/_,this._y=(h+g)/_,this._z=.25*_}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let r=e.dot(t)+1;return r<1e-8?(r=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=r):(this._x=0,this._y=-e.z,this._z=e.y,this._w=r)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=r),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Mt(this.dot(e),-1,1)))}rotateTowards(e,t){const r=this.angleTo(e);if(r===0)return this;const a=Math.min(1,t/r);return this.slerp(e,a),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const r=e._x,a=e._y,l=e._z,c=e._w,d=t._x,h=t._y,f=t._z,g=t._w;return this._x=r*g+c*d+a*f-l*h,this._y=a*g+c*h+l*d-r*f,this._z=l*g+c*f+r*h-a*d,this._w=c*g-r*d-a*h-l*f,this._onChangeCallback(),this}slerp(e,t){let r=e._x,a=e._y,l=e._z,c=e._w,d=this.dot(e);d<0&&(r=-r,a=-a,l=-l,c=-c,d=-d);let h=1-t;if(d<.9995){const f=Math.acos(d),g=Math.sin(f);h=Math.sin(h*f)/g,t=Math.sin(t*f)/g,this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this._onChangeCallback()}else this._x=this._x*h+r*t,this._y=this._y*h+a*t,this._z=this._z*h+l*t,this._w=this._w*h+c*t,this.normalize();return this}slerpQuaternions(e,t,r){return this.copy(e).slerp(t,r)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),r=Math.random(),a=Math.sqrt(1-r),l=Math.sqrt(r);return this.set(a*Math.sin(e),a*Math.cos(e),l*Math.sin(t),l*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Wm=class Wm{constructor(e=0,t=0,r=0){this.x=e,this.y=t,this.z=r}set(e,t,r){return r===void 0&&(r=this.z),this.x=e,this.y=t,this.z=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Jx.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Jx.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[3]*r+l[6]*a,this.y=l[1]*t+l[4]*r+l[7]*a,this.z=l[2]*t+l[5]*r+l[8]*a,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=e.elements,c=1/(l[3]*t+l[7]*r+l[11]*a+l[15]);return this.x=(l[0]*t+l[4]*r+l[8]*a+l[12])*c,this.y=(l[1]*t+l[5]*r+l[9]*a+l[13])*c,this.z=(l[2]*t+l[6]*r+l[10]*a+l[14])*c,this}applyQuaternion(e){const t=this.x,r=this.y,a=this.z,l=e.x,c=e.y,d=e.z,h=e.w,f=2*(c*a-d*r),g=2*(d*t-l*a),p=2*(l*r-c*t);return this.x=t+h*f+c*p-d*g,this.y=r+h*g+d*f-l*p,this.z=a+h*p+l*g-c*f,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,r=this.y,a=this.z,l=e.elements;return this.x=l[0]*t+l[4]*r+l[8]*a,this.y=l[1]*t+l[5]*r+l[9]*a,this.z=l[2]*t+l[6]*r+l[10]*a,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this.z=Mt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this.z=Mt(this.z,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const r=e.x,a=e.y,l=e.z,c=t.x,d=t.y,h=t.z;return this.x=a*h-l*d,this.y=l*c-r*h,this.z=r*d-a*c,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const r=e.dot(this)/t;return this.copy(e).multiplyScalar(r)}projectOnPlane(e){return vf.copy(this).projectOnVector(e),this.sub(vf)}reflect(e){return this.sub(vf.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const r=this.dot(e)/t;return Math.acos(Mt(r,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,r=this.y-e.y,a=this.z-e.z;return t*t+r*r+a*a}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,r){const a=Math.sin(t)*e;return this.x=a*Math.sin(r),this.y=Math.cos(t)*e,this.z=a*Math.cos(r),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,r){return this.x=e*Math.sin(t),this.y=r,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),r=this.setFromMatrixColumn(e,1).length(),a=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=r,this.z=a,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,r=Math.sqrt(1-t*t);return this.x=r*Math.cos(e),this.y=t,this.z=r*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Wm.prototype.isVector3=!0;let te=Wm;const vf=new te,Jx=new ks,Xm=class Xm{constructor(e,t,r,a,l,c,d,h,f){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f)}set(e,t,r,a,l,c,d,h,f){const g=this.elements;return g[0]=e,g[1]=a,g[2]=d,g[3]=t,g[4]=l,g[5]=h,g[6]=r,g[7]=c,g[8]=f,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],this}extractBasis(e,t,r){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),r.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[3],h=r[6],f=r[1],g=r[4],p=r[7],v=r[2],_=r[5],E=r[8],b=a[0],M=a[3],S=a[6],P=a[1],L=a[4],C=a[7],I=a[2],N=a[5],U=a[8];return l[0]=c*b+d*P+h*I,l[3]=c*M+d*L+h*N,l[6]=c*S+d*C+h*U,l[1]=f*b+g*P+p*I,l[4]=f*M+g*L+p*N,l[7]=f*S+g*C+p*U,l[2]=v*b+_*P+E*I,l[5]=v*M+_*L+E*N,l[8]=v*S+_*C+E*U,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],g=e[8];return t*c*g-t*d*f-r*l*g+r*d*h+a*l*f-a*c*h}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],g=e[8],p=g*c-d*f,v=d*h-g*l,_=f*l-c*h,E=t*p+r*v+a*_;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);const b=1/E;return e[0]=p*b,e[1]=(a*f-g*r)*b,e[2]=(d*r-a*c)*b,e[3]=v*b,e[4]=(g*t-a*h)*b,e[5]=(a*l-d*t)*b,e[6]=_*b,e[7]=(r*h-f*t)*b,e[8]=(c*t-r*l)*b,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,r,a,l,c,d){const h=Math.cos(l),f=Math.sin(l);return this.set(r*h,r*f,-r*(h*c+f*d)+c+e,-a*f,a*h,-a*(-f*c+h*d)+d+t,0,0,1),this}scale(e,t){return xo("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(_f.makeScale(e,t)),this}rotate(e){return xo("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(_f.makeRotation(-e)),this}translate(e,t){return xo("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(_f.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,r,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<9;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<9;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Xm.prototype.isMatrix3=!0;let pt=Xm;const _f=new pt,ev=new pt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),tv=new pt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Mb(){const i={enabled:!0,workingColorSpace:od,spaces:{},convert:function(a,l,c){return this.enabled===!1||l===c||!l||!c||(this.spaces[l].transfer===Bt&&(a.r=Xr(a.r),a.g=Xr(a.g),a.b=Xr(a.b)),this.spaces[l].primaries!==this.spaces[c].primaries&&(a.applyMatrix3(this.spaces[l].toXYZ),a.applyMatrix3(this.spaces[c].fromXYZ)),this.spaces[c].transfer===Bt&&(a.r=vo(a.r),a.g=vo(a.g),a.b=vo(a.b))),a},workingToColorSpace:function(a,l){return this.convert(a,this.workingColorSpace,l)},colorSpaceToWorking:function(a,l){return this.convert(a,l,this.workingColorSpace)},getPrimaries:function(a){return this.spaces[a].primaries},getTransfer:function(a){return a===bs?ld:this.spaces[a].transfer},getToneMappingMode:function(a){return this.spaces[a].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(a,l=this.workingColorSpace){return a.fromArray(this.spaces[l].luminanceCoefficients)},define:function(a){Object.assign(this.spaces,a)},_getMatrix:function(a,l,c){return a.copy(this.spaces[l].toXYZ).multiply(this.spaces[c].fromXYZ)},_getDrawingBufferColorSpace:function(a){return this.spaces[a].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(a=this.workingColorSpace){return this.spaces[a].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(a,l){return xo("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(a,l)},toWorkingColorSpace:function(a,l){return xo("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(a,l)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],r=[.3127,.329];return i.define({[od]:{primaries:e,whitePoint:r,transfer:ld,toXYZ:ev,fromXYZ:tv,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Jn},outputColorSpaceConfig:{drawingBufferColorSpace:Jn}},[Jn]:{primaries:e,whitePoint:r,transfer:Bt,toXYZ:ev,fromXYZ:tv,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Jn}}}),i}const Tt=Mb();function Xr(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function vo(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Qa;class Eb{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let r;if(e instanceof HTMLCanvasElement)r=e;else{Qa===void 0&&(Qa=ql("canvas")),Qa.width=e.width,Qa.height=e.height;const a=Qa.getContext("2d");e instanceof ImageData?a.putImageData(e,0,0):a.drawImage(e,0,0,e.width,e.height),r=Qa}return r.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=ql("canvas");t.width=e.width,t.height=e.height;const r=t.getContext("2d");r.drawImage(e,0,0,e.width,e.height);const a=r.getImageData(0,0,e.width,e.height),l=a.data;for(let c=0;c<l.length;c++)l[c]=Xr(l[c]/255)*255;return r.putImageData(a,0,0),t}else if(e.data){const t=e.data.slice(0);for(let r=0;r<t.length;r++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[r]=Math.floor(Xr(t[r]/255)*255):t[r]=Xr(t[r]);return{data:t,width:e.width,height:e.height}}else return ot("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let wb=0;class zm{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:wb++}),this.uuid=nc(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const r={uuid:this.uuid,url:""},a=this.data;if(a!==null){let l;if(Array.isArray(a)){l=[];for(let c=0,d=a.length;c<d;c++)a[c].isDataTexture?l.push(yf(a[c].image)):l.push(yf(a[c]))}else l=yf(a);r.url=l}return t||(e.images[this.uuid]=r),r}}function yf(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Eb.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(ot("Texture: Unable to serialize Texture."),{})}let bb=0;const Sf=new te;class Wn extends zs{constructor(e=Wn.DEFAULT_IMAGE,t=Wn.DEFAULT_MAPPING,r=jr,a=jr,l=jn,c=da,d=Ki,h=Si,f=Wn.DEFAULT_ANISOTROPY,g=bs){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:bb++}),this.uuid=nc(),this.name="",this.source=new zm(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=r,this.wrapT=a,this.magFilter=l,this.minFilter=c,this.anisotropy=f,this.format=d,this.internalFormat=null,this.type=h,this.offset=new ut(0,0),this.repeat=new ut(1,1),this.center=new ut(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new pt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=g,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Sf).x}get height(){return this.source.getSize(Sf).y}get depth(){return this.source.getSize(Sf).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const r=e[t];if(r===void 0){ot(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){ot(`Texture.setValues(): property '${t}' does not exist.`);continue}a&&r&&a.isVector2&&r.isVector2||a&&r&&a.isVector3&&r.isVector3||a&&r&&a.isMatrix3&&r.isMatrix3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const r={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(r.userData=this.userData),t||(e.textures[this.uuid]=r),r}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==hy)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Cp:e.x=e.x-Math.floor(e.x);break;case jr:e.x=e.x<0?0:1;break;case Rp:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Cp:e.y=e.y-Math.floor(e.y);break;case jr:e.y=e.y<0?0:1;break;case Rp:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Wn.DEFAULT_IMAGE=null;Wn.DEFAULT_MAPPING=hy;Wn.DEFAULT_ANISOTROPY=1;const $m=class $m{constructor(e=0,t=0,r=0,a=1){this.x=e,this.y=t,this.z=r,this.w=a}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,r,a){return this.x=e,this.y=t,this.z=r,this.w=a,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,r=this.y,a=this.z,l=this.w,c=e.elements;return this.x=c[0]*t+c[4]*r+c[8]*a+c[12]*l,this.y=c[1]*t+c[5]*r+c[9]*a+c[13]*l,this.z=c[2]*t+c[6]*r+c[10]*a+c[14]*l,this.w=c[3]*t+c[7]*r+c[11]*a+c[15]*l,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,r,a,l;const h=e.elements,f=h[0],g=h[4],p=h[8],v=h[1],_=h[5],E=h[9],b=h[2],M=h[6],S=h[10];if(Math.abs(g-v)<.01&&Math.abs(p-b)<.01&&Math.abs(E-M)<.01){if(Math.abs(g+v)<.1&&Math.abs(p+b)<.1&&Math.abs(E+M)<.1&&Math.abs(f+_+S-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const L=(f+1)/2,C=(_+1)/2,I=(S+1)/2,N=(g+v)/4,U=(p+b)/4,w=(E+M)/4;return L>C&&L>I?L<.01?(r=0,a=.707106781,l=.707106781):(r=Math.sqrt(L),a=N/r,l=U/r):C>I?C<.01?(r=.707106781,a=0,l=.707106781):(a=Math.sqrt(C),r=N/a,l=w/a):I<.01?(r=.707106781,a=.707106781,l=0):(l=Math.sqrt(I),r=U/l,a=w/l),this.set(r,a,l,t),this}let P=Math.sqrt((M-E)*(M-E)+(p-b)*(p-b)+(v-g)*(v-g));return Math.abs(P)<.001&&(P=1),this.x=(M-E)/P,this.y=(p-b)/P,this.z=(v-g)/P,this.w=Math.acos((f+_+S-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Mt(this.x,e.x,t.x),this.y=Mt(this.y,e.y,t.y),this.z=Mt(this.z,e.z,t.z),this.w=Mt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Mt(this.x,e,t),this.y=Mt(this.y,e,t),this.z=Mt(this.z,e,t),this.w=Mt(this.w,e,t),this}clampLength(e,t){const r=this.length();return this.divideScalar(r||1).multiplyScalar(Mt(r,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,r){return this.x=e.x+(t.x-e.x)*r,this.y=e.y+(t.y-e.y)*r,this.z=e.z+(t.z-e.z)*r,this.w=e.w+(t.w-e.w)*r,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};$m.prototype.isVector4=!0;let cn=$m;class Tb extends zs{constructor(e=1,t=1,r={}){super(),r=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:jn,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},r),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=r.depth,this.scissor=new cn(0,0,e,t),this.scissorTest=!1,this.viewport=new cn(0,0,e,t),this.textures=[];const a={width:e,height:t,depth:r.depth},l=new Wn(a),c=r.count;for(let d=0;d<c;d++)this.textures[d]=l.clone(),this.textures[d].isRenderTargetTexture=!0,this.textures[d].renderTarget=this;this._setTextureOptions(r),this.depthBuffer=r.depthBuffer,this.stencilBuffer=r.stencilBuffer,this.resolveDepthBuffer=r.resolveDepthBuffer,this.resolveStencilBuffer=r.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=r.depthTexture,this.samples=r.samples,this.multiview=r.multiview,this.useArrayDepthTexture=r.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:jn,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let r=0;r<this.textures.length;r++)this.textures[r].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,r=1){if(this.width!==e||this.height!==t||this.depth!==r){this.width=e,this.height=t,this.depth=r;for(let a=0,l=this.textures.length;a<l;a++)this.textures[a].image.width=e,this.textures[a].image.height=t,this.textures[a].image.depth=r,this.textures[a].isData3DTexture!==!0&&(this.textures[a].isArrayTexture=this.textures[a].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,r=e.textures.length;t<r;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const a=Object.assign({},e.textures[t].image);this.textures[t].source=new zm(a)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class vr extends Tb{constructor(e=1,t=1,r={}){super(e,t,r),this.isWebGLRenderTarget=!0}}class Sy extends Wn{constructor(e=null,t=1,r=1,a=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=jr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Cb extends Wn{constructor(e=null,t=1,r=1,a=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:r,depth:a},this.magFilter=Un,this.minFilter=Un,this.wrapR=jr,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const hd=class hd{constructor(e,t,r,a,l,c,d,h,f,g,p,v,_,E,b,M){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,r,a,l,c,d,h,f,g,p,v,_,E,b,M)}set(e,t,r,a,l,c,d,h,f,g,p,v,_,E,b,M){const S=this.elements;return S[0]=e,S[4]=t,S[8]=r,S[12]=a,S[1]=l,S[5]=c,S[9]=d,S[13]=h,S[2]=f,S[6]=g,S[10]=p,S[14]=v,S[3]=_,S[7]=E,S[11]=b,S[15]=M,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new hd().fromArray(this.elements)}copy(e){const t=this.elements,r=e.elements;return t[0]=r[0],t[1]=r[1],t[2]=r[2],t[3]=r[3],t[4]=r[4],t[5]=r[5],t[6]=r[6],t[7]=r[7],t[8]=r[8],t[9]=r[9],t[10]=r[10],t[11]=r[11],t[12]=r[12],t[13]=r[13],t[14]=r[14],t[15]=r[15],this}copyPosition(e){const t=this.elements,r=e.elements;return t[12]=r[12],t[13]=r[13],t[14]=r[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,r){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),r.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),r.setFromMatrixColumn(this,2),this)}makeBasis(e,t,r){return this.set(e.x,t.x,r.x,0,e.y,t.y,r.y,0,e.z,t.z,r.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,r=e.elements,a=1/Za.setFromMatrixColumn(e,0).length(),l=1/Za.setFromMatrixColumn(e,1).length(),c=1/Za.setFromMatrixColumn(e,2).length();return t[0]=r[0]*a,t[1]=r[1]*a,t[2]=r[2]*a,t[3]=0,t[4]=r[4]*l,t[5]=r[5]*l,t[6]=r[6]*l,t[7]=0,t[8]=r[8]*c,t[9]=r[9]*c,t[10]=r[10]*c,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,r=e.x,a=e.y,l=e.z,c=Math.cos(r),d=Math.sin(r),h=Math.cos(a),f=Math.sin(a),g=Math.cos(l),p=Math.sin(l);if(e.order==="XYZ"){const v=c*g,_=c*p,E=d*g,b=d*p;t[0]=h*g,t[4]=-h*p,t[8]=f,t[1]=_+E*f,t[5]=v-b*f,t[9]=-d*h,t[2]=b-v*f,t[6]=E+_*f,t[10]=c*h}else if(e.order==="YXZ"){const v=h*g,_=h*p,E=f*g,b=f*p;t[0]=v+b*d,t[4]=E*d-_,t[8]=c*f,t[1]=c*p,t[5]=c*g,t[9]=-d,t[2]=_*d-E,t[6]=b+v*d,t[10]=c*h}else if(e.order==="ZXY"){const v=h*g,_=h*p,E=f*g,b=f*p;t[0]=v-b*d,t[4]=-c*p,t[8]=E+_*d,t[1]=_+E*d,t[5]=c*g,t[9]=b-v*d,t[2]=-c*f,t[6]=d,t[10]=c*h}else if(e.order==="ZYX"){const v=c*g,_=c*p,E=d*g,b=d*p;t[0]=h*g,t[4]=E*f-_,t[8]=v*f+b,t[1]=h*p,t[5]=b*f+v,t[9]=_*f-E,t[2]=-f,t[6]=d*h,t[10]=c*h}else if(e.order==="YZX"){const v=c*h,_=c*f,E=d*h,b=d*f;t[0]=h*g,t[4]=b-v*p,t[8]=E*p+_,t[1]=p,t[5]=c*g,t[9]=-d*g,t[2]=-f*g,t[6]=_*p+E,t[10]=v-b*p}else if(e.order==="XZY"){const v=c*h,_=c*f,E=d*h,b=d*f;t[0]=h*g,t[4]=-p,t[8]=f*g,t[1]=v*p+b,t[5]=c*g,t[9]=_*p-E,t[2]=E*p-_,t[6]=d*g,t[10]=b*p+v}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Rb,e,Ab)}lookAt(e,t,r){const a=this.elements;return xi.subVectors(e,t),xi.lengthSq()===0&&(xi.z=1),xi.normalize(),xs.crossVectors(r,xi),xs.lengthSq()===0&&(Math.abs(r.z)===1?xi.x+=1e-4:xi.z+=1e-4,xi.normalize(),xs.crossVectors(r,xi)),xs.normalize(),mu.crossVectors(xi,xs),a[0]=xs.x,a[4]=mu.x,a[8]=xi.x,a[1]=xs.y,a[5]=mu.y,a[9]=xi.y,a[2]=xs.z,a[6]=mu.z,a[10]=xi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const r=e.elements,a=t.elements,l=this.elements,c=r[0],d=r[4],h=r[8],f=r[12],g=r[1],p=r[5],v=r[9],_=r[13],E=r[2],b=r[6],M=r[10],S=r[14],P=r[3],L=r[7],C=r[11],I=r[15],N=a[0],U=a[4],w=a[8],D=a[12],z=a[1],H=a[5],X=a[9],j=a[13],le=a[2],$=a[6],ue=a[10],J=a[14],K=a[3],re=a[7],de=a[11],F=a[15];return l[0]=c*N+d*z+h*le+f*K,l[4]=c*U+d*H+h*$+f*re,l[8]=c*w+d*X+h*ue+f*de,l[12]=c*D+d*j+h*J+f*F,l[1]=g*N+p*z+v*le+_*K,l[5]=g*U+p*H+v*$+_*re,l[9]=g*w+p*X+v*ue+_*de,l[13]=g*D+p*j+v*J+_*F,l[2]=E*N+b*z+M*le+S*K,l[6]=E*U+b*H+M*$+S*re,l[10]=E*w+b*X+M*ue+S*de,l[14]=E*D+b*j+M*J+S*F,l[3]=P*N+L*z+C*le+I*K,l[7]=P*U+L*H+C*$+I*re,l[11]=P*w+L*X+C*ue+I*de,l[15]=P*D+L*j+C*J+I*F,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[12],c=e[1],d=e[5],h=e[9],f=e[13],g=e[2],p=e[6],v=e[10],_=e[14],E=e[3],b=e[7],M=e[11],S=e[15],P=h*_-f*v,L=d*_-f*p,C=d*v-h*p,I=c*_-f*g,N=c*v-h*g,U=c*p-d*g;return t*(b*P-M*L+S*C)-r*(E*P-M*I+S*N)+a*(E*L-b*I+S*U)-l*(E*C-b*N+M*U)}determinantAffine(){const e=this.elements,t=e[0],r=e[4],a=e[8],l=e[1],c=e[5],d=e[9],h=e[2],f=e[6],g=e[10];return t*(c*g-d*f)-r*(l*g-d*h)+a*(l*f-c*h)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,r){const a=this.elements;return e.isVector3?(a[12]=e.x,a[13]=e.y,a[14]=e.z):(a[12]=e,a[13]=t,a[14]=r),this}invert(){const e=this.elements,t=e[0],r=e[1],a=e[2],l=e[3],c=e[4],d=e[5],h=e[6],f=e[7],g=e[8],p=e[9],v=e[10],_=e[11],E=e[12],b=e[13],M=e[14],S=e[15],P=t*d-r*c,L=t*h-a*c,C=t*f-l*c,I=r*h-a*d,N=r*f-l*d,U=a*f-l*h,w=g*b-p*E,D=g*M-v*E,z=g*S-_*E,H=p*M-v*b,X=p*S-_*b,j=v*S-_*M,le=P*j-L*X+C*H+I*z-N*D+U*w;if(le===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const $=1/le;return e[0]=(d*j-h*X+f*H)*$,e[1]=(a*X-r*j-l*H)*$,e[2]=(b*U-M*N+S*I)*$,e[3]=(v*N-p*U-_*I)*$,e[4]=(h*z-c*j-f*D)*$,e[5]=(t*j-a*z+l*D)*$,e[6]=(M*C-E*U-S*L)*$,e[7]=(g*U-v*C+_*L)*$,e[8]=(c*X-d*z+f*w)*$,e[9]=(r*z-t*X-l*w)*$,e[10]=(E*N-b*C+S*P)*$,e[11]=(p*C-g*N-_*P)*$,e[12]=(d*D-c*H-h*w)*$,e[13]=(t*H-r*D+a*w)*$,e[14]=(b*L-E*I-M*P)*$,e[15]=(g*I-p*L+v*P)*$,this}scale(e){const t=this.elements,r=e.x,a=e.y,l=e.z;return t[0]*=r,t[4]*=a,t[8]*=l,t[1]*=r,t[5]*=a,t[9]*=l,t[2]*=r,t[6]*=a,t[10]*=l,t[3]*=r,t[7]*=a,t[11]*=l,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],r=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],a=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,r,a))}makeTranslation(e,t,r){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,r,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),r=Math.sin(e);return this.set(1,0,0,0,0,t,-r,0,0,r,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,0,r,0,0,1,0,0,-r,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),r=Math.sin(e);return this.set(t,-r,0,0,r,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const r=Math.cos(t),a=Math.sin(t),l=1-r,c=e.x,d=e.y,h=e.z,f=l*c,g=l*d;return this.set(f*c+r,f*d-a*h,f*h+a*d,0,f*d+a*h,g*d+r,g*h-a*c,0,f*h-a*d,g*h+a*c,l*h*h+r,0,0,0,0,1),this}makeScale(e,t,r){return this.set(e,0,0,0,0,t,0,0,0,0,r,0,0,0,0,1),this}makeShear(e,t,r,a,l,c){return this.set(1,r,l,0,e,1,c,0,t,a,1,0,0,0,0,1),this}compose(e,t,r){const a=this.elements,l=t._x,c=t._y,d=t._z,h=t._w,f=l+l,g=c+c,p=d+d,v=l*f,_=l*g,E=l*p,b=c*g,M=c*p,S=d*p,P=h*f,L=h*g,C=h*p,I=r.x,N=r.y,U=r.z;return a[0]=(1-(b+S))*I,a[1]=(_+C)*I,a[2]=(E-L)*I,a[3]=0,a[4]=(_-C)*N,a[5]=(1-(v+S))*N,a[6]=(M+P)*N,a[7]=0,a[8]=(E+L)*U,a[9]=(M-P)*U,a[10]=(1-(v+b))*U,a[11]=0,a[12]=e.x,a[13]=e.y,a[14]=e.z,a[15]=1,this}decompose(e,t,r){const a=this.elements;e.x=a[12],e.y=a[13],e.z=a[14];const l=this.determinantAffine();if(l===0)return r.set(1,1,1),t.identity(),this;let c=Za.set(a[0],a[1],a[2]).length();const d=Za.set(a[4],a[5],a[6]).length(),h=Za.set(a[8],a[9],a[10]).length();l<0&&(c=-c),ji.copy(this);const f=1/c,g=1/d,p=1/h;return ji.elements[0]*=f,ji.elements[1]*=f,ji.elements[2]*=f,ji.elements[4]*=g,ji.elements[5]*=g,ji.elements[6]*=g,ji.elements[8]*=p,ji.elements[9]*=p,ji.elements[10]*=p,t.setFromRotationMatrix(ji),r.x=c,r.y=d,r.z=h,this}makePerspective(e,t,r,a,l,c,d=mr,h=!1){const f=this.elements,g=2*l/(t-e),p=2*l/(r-a),v=(t+e)/(t-e),_=(r+a)/(r-a);let E,b;if(h)E=l/(c-l),b=c*l/(c-l);else if(d===mr)E=-(c+l)/(c-l),b=-2*c*l/(c-l);else if(d===$l)E=-c/(c-l),b=-c*l/(c-l);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+d);return f[0]=g,f[4]=0,f[8]=v,f[12]=0,f[1]=0,f[5]=p,f[9]=_,f[13]=0,f[2]=0,f[6]=0,f[10]=E,f[14]=b,f[3]=0,f[7]=0,f[11]=-1,f[15]=0,this}makeOrthographic(e,t,r,a,l,c,d=mr,h=!1){const f=this.elements,g=2/(t-e),p=2/(r-a),v=-(t+e)/(t-e),_=-(r+a)/(r-a);let E,b;if(h)E=1/(c-l),b=c/(c-l);else if(d===mr)E=-2/(c-l),b=-(c+l)/(c-l);else if(d===$l)E=-1/(c-l),b=-l/(c-l);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+d);return f[0]=g,f[4]=0,f[8]=0,f[12]=v,f[1]=0,f[5]=p,f[9]=0,f[13]=_,f[2]=0,f[6]=0,f[10]=E,f[14]=b,f[3]=0,f[7]=0,f[11]=0,f[15]=1,this}equals(e){const t=this.elements,r=e.elements;for(let a=0;a<16;a++)if(t[a]!==r[a])return!1;return!0}fromArray(e,t=0){for(let r=0;r<16;r++)this.elements[r]=e[r+t];return this}toArray(e=[],t=0){const r=this.elements;return e[t]=r[0],e[t+1]=r[1],e[t+2]=r[2],e[t+3]=r[3],e[t+4]=r[4],e[t+5]=r[5],e[t+6]=r[6],e[t+7]=r[7],e[t+8]=r[8],e[t+9]=r[9],e[t+10]=r[10],e[t+11]=r[11],e[t+12]=r[12],e[t+13]=r[13],e[t+14]=r[14],e[t+15]=r[15],e}};hd.prototype.isMatrix4=!0;let rn=hd;const Za=new te,ji=new rn,Rb=new te(0,0,0),Ab=new te(1,1,1),xs=new te,mu=new te,xi=new te,nv=new rn,iv=new ks;class Qr{constructor(e=0,t=0,r=0,a=Qr.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=r,this._order=a}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,r,a=this._order){return this._x=e,this._y=t,this._z=r,this._order=a,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,r=!0){const a=e.elements,l=a[0],c=a[4],d=a[8],h=a[1],f=a[5],g=a[9],p=a[2],v=a[6],_=a[10];switch(t){case"XYZ":this._y=Math.asin(Mt(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(-g,_),this._z=Math.atan2(-c,l)):(this._x=Math.atan2(v,f),this._z=0);break;case"YXZ":this._x=Math.asin(-Mt(g,-1,1)),Math.abs(g)<.9999999?(this._y=Math.atan2(d,_),this._z=Math.atan2(h,f)):(this._y=Math.atan2(-p,l),this._z=0);break;case"ZXY":this._x=Math.asin(Mt(v,-1,1)),Math.abs(v)<.9999999?(this._y=Math.atan2(-p,_),this._z=Math.atan2(-c,f)):(this._y=0,this._z=Math.atan2(h,l));break;case"ZYX":this._y=Math.asin(-Mt(p,-1,1)),Math.abs(p)<.9999999?(this._x=Math.atan2(v,_),this._z=Math.atan2(h,l)):(this._x=0,this._z=Math.atan2(-c,f));break;case"YZX":this._z=Math.asin(Mt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(-g,f),this._y=Math.atan2(-p,l)):(this._x=0,this._y=Math.atan2(d,_));break;case"XZY":this._z=Math.asin(-Mt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(v,f),this._y=Math.atan2(d,l)):(this._x=Math.atan2(-g,_),this._y=0);break;default:ot("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,r===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,r){return nv.makeRotationFromQuaternion(e),this.setFromRotationMatrix(nv,t,r)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return iv.setFromEuler(this),this.setFromQuaternion(iv,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Qr.DEFAULT_ORDER="XYZ";class My{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Pb=0;const rv=new te,Ja=new ks,Lr=new rn,gu=new te,Rl=new te,Nb=new te,Lb=new ks,sv=new te(1,0,0),av=new te(0,1,0),ov=new te(0,0,1),lv={type:"added"},Db={type:"removed"},eo={type:"childadded",child:null},Mf={type:"childremoved",child:null};class Mn extends zs{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Pb++}),this.uuid=nc(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Mn.DEFAULT_UP.clone();const e=new te,t=new Qr,r=new ks,a=new te(1,1,1);function l(){r.setFromEuler(t,!1)}function c(){t.setFromQuaternion(r,void 0,!1)}t._onChange(l),r._onChange(c),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:a},modelViewMatrix:{value:new rn},normalMatrix:{value:new pt}}),this.matrix=new rn,this.matrixWorld=new rn,this.matrixAutoUpdate=Mn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Mn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new My,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ja.setFromAxisAngle(e,t),this.quaternion.multiply(Ja),this}rotateOnWorldAxis(e,t){return Ja.setFromAxisAngle(e,t),this.quaternion.premultiply(Ja),this}rotateX(e){return this.rotateOnAxis(sv,e)}rotateY(e){return this.rotateOnAxis(av,e)}rotateZ(e){return this.rotateOnAxis(ov,e)}translateOnAxis(e,t){return rv.copy(e).applyQuaternion(this.quaternion),this.position.add(rv.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(sv,e)}translateY(e){return this.translateOnAxis(av,e)}translateZ(e){return this.translateOnAxis(ov,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Lr.copy(this.matrixWorld).invert())}lookAt(e,t,r){e.isVector3?gu.copy(e):gu.set(e,t,r);const a=this.parent;this.updateWorldMatrix(!0,!1),Rl.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Lr.lookAt(Rl,gu,this.up):Lr.lookAt(gu,Rl,this.up),this.quaternion.setFromRotationMatrix(Lr),a&&(Lr.extractRotation(a.matrixWorld),Ja.setFromRotationMatrix(Lr),this.quaternion.premultiply(Ja.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Pt("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(lv),eo.child=e,this.dispatchEvent(eo),eo.child=null):Pt("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let r=0;r<arguments.length;r++)this.remove(arguments[r]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Db),Mf.child=e,this.dispatchEvent(Mf),Mf.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Lr.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Lr.multiply(e.parent.matrixWorld)),e.applyMatrix4(Lr),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(lv),eo.child=e,this.dispatchEvent(eo),eo.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let r=0,a=this.children.length;r<a;r++){const c=this.children[r].getObjectByProperty(e,t);if(c!==void 0)return c}}getObjectsByProperty(e,t,r=[]){this[e]===t&&r.push(this);const a=this.children;for(let l=0,c=a.length;l<c;l++)a[l].getObjectsByProperty(e,t,r);return r}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,e,Nb),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Rl,Lb,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,r=e.y,a=e.z,l=this.matrix.elements;l[12]+=t-l[0]*t-l[4]*r-l[8]*a,l[13]+=r-l[1]*t-l[5]*r-l[9]*a,l[14]+=a-l[2]*t-l[6]*r-l[10]*a}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let r=0,a=t.length;r<a;r++)t[r].updateMatrixWorld(e)}updateWorldMatrix(e,t,r=!1){const a=this.parent;if(e===!0&&a!==null&&a.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||r)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,r=!0),t===!0){const l=this.children;for(let c=0,d=l.length;c<d;c++)l[c].updateWorldMatrix(!1,!0,r)}}toJSON(e){const t=e===void 0||typeof e=="string",r={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},r.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const a={};a.uuid=this.uuid,a.type=this.type,this.name!==""&&(a.name=this.name),this.castShadow===!0&&(a.castShadow=!0),this.receiveShadow===!0&&(a.receiveShadow=!0),this.visible===!1&&(a.visible=!1),this.frustumCulled===!1&&(a.frustumCulled=!1),this.renderOrder!==0&&(a.renderOrder=this.renderOrder),this.static!==!1&&(a.static=this.static),Object.keys(this.userData).length>0&&(a.userData=this.userData),a.layers=this.layers.mask,a.matrix=this.matrix.toArray(),a.up=this.up.toArray(),this.pivot!==null&&(a.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(a.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(a.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(a.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(a.type="InstancedMesh",a.count=this.count,a.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(a.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(a.type="BatchedMesh",a.perObjectFrustumCulled=this.perObjectFrustumCulled,a.sortObjects=this.sortObjects,a.drawRanges=this._drawRanges,a.reservedRanges=this._reservedRanges,a.geometryInfo=this._geometryInfo.map(d=>({...d,boundingBox:d.boundingBox?d.boundingBox.toJSON():void 0,boundingSphere:d.boundingSphere?d.boundingSphere.toJSON():void 0})),a.instanceInfo=this._instanceInfo.map(d=>({...d})),a.availableInstanceIds=this._availableInstanceIds.slice(),a.availableGeometryIds=this._availableGeometryIds.slice(),a.nextIndexStart=this._nextIndexStart,a.nextVertexStart=this._nextVertexStart,a.geometryCount=this._geometryCount,a.maxInstanceCount=this._maxInstanceCount,a.maxVertexCount=this._maxVertexCount,a.maxIndexCount=this._maxIndexCount,a.geometryInitialized=this._geometryInitialized,a.matricesTexture=this._matricesTexture.toJSON(e),a.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(a.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(a.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(a.boundingBox=this.boundingBox.toJSON()));function l(d,h){return d[h.uuid]===void 0&&(d[h.uuid]=h.toJSON(e)),h.uuid}if(this.isScene)this.background&&(this.background.isColor?a.background=this.background.toJSON():this.background.isTexture&&(a.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(a.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){a.geometry=l(e.geometries,this.geometry);const d=this.geometry.parameters;if(d!==void 0&&d.shapes!==void 0){const h=d.shapes;if(Array.isArray(h))for(let f=0,g=h.length;f<g;f++){const p=h[f];l(e.shapes,p)}else l(e.shapes,h)}}if(this.isSkinnedMesh&&(a.bindMode=this.bindMode,a.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(l(e.skeletons,this.skeleton),a.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const d=[];for(let h=0,f=this.material.length;h<f;h++)d.push(l(e.materials,this.material[h]));a.material=d}else a.material=l(e.materials,this.material);if(this.children.length>0){a.children=[];for(let d=0;d<this.children.length;d++)a.children.push(this.children[d].toJSON(e).object)}if(this.animations.length>0){a.animations=[];for(let d=0;d<this.animations.length;d++){const h=this.animations[d];a.animations.push(l(e.animations,h))}}if(t){const d=c(e.geometries),h=c(e.materials),f=c(e.textures),g=c(e.images),p=c(e.shapes),v=c(e.skeletons),_=c(e.animations),E=c(e.nodes);d.length>0&&(r.geometries=d),h.length>0&&(r.materials=h),f.length>0&&(r.textures=f),g.length>0&&(r.images=g),p.length>0&&(r.shapes=p),v.length>0&&(r.skeletons=v),_.length>0&&(r.animations=_),E.length>0&&(r.nodes=E)}return r.object=a,r;function c(d){const h=[];for(const f in d){const g=d[f];delete g.metadata,h.push(g)}return h}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let r=0;r<e.children.length;r++){const a=e.children[r];this.add(a.clone())}return this}}Mn.DEFAULT_UP=new te(0,1,0);Mn.DEFAULT_MATRIX_AUTO_UPDATE=!0;Mn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class Ol extends Mn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Ib={type:"move"};class Ef{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Ol,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Ol,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new te,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new te),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Ol,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new te,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new te,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const r of e.hand.values())this._getHandJoint(t,r)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,r){let a=null,l=null,c=null;const d=this._targetRay,h=this._grip,f=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(f&&e.hand){c=!0;for(const b of e.hand.values()){const M=t.getJointPose(b,r),S=this._getHandJoint(f,b);M!==null&&(S.matrix.fromArray(M.transform.matrix),S.matrix.decompose(S.position,S.rotation,S.scale),S.matrixWorldNeedsUpdate=!0,S.jointRadius=M.radius),S.visible=M!==null}const g=f.joints["index-finger-tip"],p=f.joints["thumb-tip"],v=g.position.distanceTo(p.position),_=.02,E=.005;f.inputState.pinching&&v>_+E?(f.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!f.inputState.pinching&&v<=_-E&&(f.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else h!==null&&e.gripSpace&&(l=t.getPose(e.gripSpace,r),l!==null&&(h.matrix.fromArray(l.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,l.linearVelocity?(h.hasLinearVelocity=!0,h.linearVelocity.copy(l.linearVelocity)):h.hasLinearVelocity=!1,l.angularVelocity?(h.hasAngularVelocity=!0,h.angularVelocity.copy(l.angularVelocity)):h.hasAngularVelocity=!1,h.eventsEnabled&&h.dispatchEvent({type:"gripUpdated",data:e,target:this})));d!==null&&(a=t.getPose(e.targetRaySpace,r),a===null&&l!==null&&(a=l),a!==null&&(d.matrix.fromArray(a.transform.matrix),d.matrix.decompose(d.position,d.rotation,d.scale),d.matrixWorldNeedsUpdate=!0,a.linearVelocity?(d.hasLinearVelocity=!0,d.linearVelocity.copy(a.linearVelocity)):d.hasLinearVelocity=!1,a.angularVelocity?(d.hasAngularVelocity=!0,d.angularVelocity.copy(a.angularVelocity)):d.hasAngularVelocity=!1,this.dispatchEvent(Ib)))}return d!==null&&(d.visible=a!==null),h!==null&&(h.visible=l!==null),f!==null&&(f.visible=c!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const r=new Ol;r.matrixAutoUpdate=!1,r.visible=!1,e.joints[t.jointName]=r,e.add(r)}return e.joints[t.jointName]}}const Ey={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},vs={h:0,s:0,l:0},xu={h:0,s:0,l:0};function wf(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class gt{constructor(e,t,r){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,r)}set(e,t,r){if(t===void 0&&r===void 0){const a=e;a&&a.isColor?this.copy(a):typeof a=="number"?this.setHex(a):typeof a=="string"&&this.setStyle(a)}else this.setRGB(e,t,r);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Jn){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Tt.colorSpaceToWorking(this,t),this}setRGB(e,t,r,a=Tt.workingColorSpace){return this.r=e,this.g=t,this.b=r,Tt.colorSpaceToWorking(this,a),this}setHSL(e,t,r,a=Tt.workingColorSpace){if(e=yb(e,1),t=Mt(t,0,1),r=Mt(r,0,1),t===0)this.r=this.g=this.b=r;else{const l=r<=.5?r*(1+t):r+t-r*t,c=2*r-l;this.r=wf(c,l,e+1/3),this.g=wf(c,l,e),this.b=wf(c,l,e-1/3)}return Tt.colorSpaceToWorking(this,a),this}setStyle(e,t=Jn){function r(l){l!==void 0&&parseFloat(l)<1&&ot("Color: Alpha component of "+e+" will be ignored.")}let a;if(a=/^(\w+)\(([^\)]*)\)/.exec(e)){let l;const c=a[1],d=a[2];switch(c){case"rgb":case"rgba":if(l=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(255,parseInt(l[1],10))/255,Math.min(255,parseInt(l[2],10))/255,Math.min(255,parseInt(l[3],10))/255,t);if(l=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setRGB(Math.min(100,parseInt(l[1],10))/100,Math.min(100,parseInt(l[2],10))/100,Math.min(100,parseInt(l[3],10))/100,t);break;case"hsl":case"hsla":if(l=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(d))return r(l[4]),this.setHSL(parseFloat(l[1])/360,parseFloat(l[2])/100,parseFloat(l[3])/100,t);break;default:ot("Color: Unknown color model "+e)}}else if(a=/^\#([A-Fa-f\d]+)$/.exec(e)){const l=a[1],c=l.length;if(c===3)return this.setRGB(parseInt(l.charAt(0),16)/15,parseInt(l.charAt(1),16)/15,parseInt(l.charAt(2),16)/15,t);if(c===6)return this.setHex(parseInt(l,16),t);ot("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Jn){const r=Ey[e.toLowerCase()];return r!==void 0?this.setHex(r,t):ot("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Xr(e.r),this.g=Xr(e.g),this.b=Xr(e.b),this}copyLinearToSRGB(e){return this.r=vo(e.r),this.g=vo(e.g),this.b=vo(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Jn){return Tt.workingToColorSpace(Vn.copy(this),e),Math.round(Mt(Vn.r*255,0,255))*65536+Math.round(Mt(Vn.g*255,0,255))*256+Math.round(Mt(Vn.b*255,0,255))}getHexString(e=Jn){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Tt.workingColorSpace){Tt.workingToColorSpace(Vn.copy(this),t);const r=Vn.r,a=Vn.g,l=Vn.b,c=Math.max(r,a,l),d=Math.min(r,a,l);let h,f;const g=(d+c)/2;if(d===c)h=0,f=0;else{const p=c-d;switch(f=g<=.5?p/(c+d):p/(2-c-d),c){case r:h=(a-l)/p+(a<l?6:0);break;case a:h=(l-r)/p+2;break;case l:h=(r-a)/p+4;break}h/=6}return e.h=h,e.s=f,e.l=g,e}getRGB(e,t=Tt.workingColorSpace){return Tt.workingToColorSpace(Vn.copy(this),t),e.r=Vn.r,e.g=Vn.g,e.b=Vn.b,e}getStyle(e=Jn){Tt.workingToColorSpace(Vn.copy(this),e);const t=Vn.r,r=Vn.g,a=Vn.b;return e!==Jn?`color(${e} ${t.toFixed(3)} ${r.toFixed(3)} ${a.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(r*255)},${Math.round(a*255)})`}offsetHSL(e,t,r){return this.getHSL(vs),this.setHSL(vs.h+e,vs.s+t,vs.l+r)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,r){return this.r=e.r+(t.r-e.r)*r,this.g=e.g+(t.g-e.g)*r,this.b=e.b+(t.b-e.b)*r,this}lerpHSL(e,t){this.getHSL(vs),e.getHSL(xu);const r=xf(vs.h,xu.h,t),a=xf(vs.s,xu.s,t),l=xf(vs.l,xu.l,t);return this.setHSL(r,a,l),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,r=this.g,a=this.b,l=e.elements;return this.r=l[0]*t+l[3]*r+l[6]*a,this.g=l[1]*t+l[4]*r+l[7]*a,this.b=l[2]*t+l[5]*r+l[8]*a,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Vn=new gt;gt.NAMES=Ey;class Ub extends Mn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Qr,this.environmentIntensity=1,this.environmentRotation=new Qr,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const Wi=new te,Dr=new te,bf=new te,Ir=new te,to=new te,no=new te,cv=new te,Tf=new te,Cf=new te,Rf=new te,Af=new cn,Pf=new cn,Nf=new cn;class qi{constructor(e=new te,t=new te,r=new te){this.a=e,this.b=t,this.c=r}static getNormal(e,t,r,a){a.subVectors(r,t),Wi.subVectors(e,t),a.cross(Wi);const l=a.lengthSq();return l>0?a.multiplyScalar(1/Math.sqrt(l)):a.set(0,0,0)}static getBarycoord(e,t,r,a,l){Wi.subVectors(a,t),Dr.subVectors(r,t),bf.subVectors(e,t);const c=Wi.dot(Wi),d=Wi.dot(Dr),h=Wi.dot(bf),f=Dr.dot(Dr),g=Dr.dot(bf),p=c*f-d*d;if(p===0)return l.set(0,0,0),null;const v=1/p,_=(f*h-d*g)*v,E=(c*g-d*h)*v;return l.set(1-_-E,E,_)}static containsPoint(e,t,r,a){return this.getBarycoord(e,t,r,a,Ir)===null?!1:Ir.x>=0&&Ir.y>=0&&Ir.x+Ir.y<=1}static getInterpolation(e,t,r,a,l,c,d,h){return this.getBarycoord(e,t,r,a,Ir)===null?(h.x=0,h.y=0,"z"in h&&(h.z=0),"w"in h&&(h.w=0),null):(h.setScalar(0),h.addScaledVector(l,Ir.x),h.addScaledVector(c,Ir.y),h.addScaledVector(d,Ir.z),h)}static getInterpolatedAttribute(e,t,r,a,l,c){return Af.setScalar(0),Pf.setScalar(0),Nf.setScalar(0),Af.fromBufferAttribute(e,t),Pf.fromBufferAttribute(e,r),Nf.fromBufferAttribute(e,a),c.setScalar(0),c.addScaledVector(Af,l.x),c.addScaledVector(Pf,l.y),c.addScaledVector(Nf,l.z),c}static isFrontFacing(e,t,r,a){return Wi.subVectors(r,t),Dr.subVectors(e,t),Wi.cross(Dr).dot(a)<0}set(e,t,r){return this.a.copy(e),this.b.copy(t),this.c.copy(r),this}setFromPointsAndIndices(e,t,r,a){return this.a.copy(e[t]),this.b.copy(e[r]),this.c.copy(e[a]),this}setFromAttributeAndIndices(e,t,r,a){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,r),this.c.fromBufferAttribute(e,a),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Wi.subVectors(this.c,this.b),Dr.subVectors(this.a,this.b),Wi.cross(Dr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return qi.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return qi.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,r,a,l){return qi.getInterpolation(e,this.a,this.b,this.c,t,r,a,l)}containsPoint(e){return qi.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return qi.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const r=this.a,a=this.b,l=this.c;let c,d;to.subVectors(a,r),no.subVectors(l,r),Tf.subVectors(e,r);const h=to.dot(Tf),f=no.dot(Tf);if(h<=0&&f<=0)return t.copy(r);Cf.subVectors(e,a);const g=to.dot(Cf),p=no.dot(Cf);if(g>=0&&p<=g)return t.copy(a);const v=h*p-g*f;if(v<=0&&h>=0&&g<=0)return c=h/(h-g),t.copy(r).addScaledVector(to,c);Rf.subVectors(e,l);const _=to.dot(Rf),E=no.dot(Rf);if(E>=0&&_<=E)return t.copy(l);const b=_*f-h*E;if(b<=0&&f>=0&&E<=0)return d=f/(f-E),t.copy(r).addScaledVector(no,d);const M=g*E-_*p;if(M<=0&&p-g>=0&&_-E>=0)return cv.subVectors(l,a),d=(p-g)/(p-g+(_-E)),t.copy(a).addScaledVector(cv,d);const S=1/(M+b+v);return c=b*S,d=v*S,t.copy(r).addScaledVector(to,c).addScaledVector(no,d)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Vo{constructor(e=new te(1/0,1/0,1/0),t=new te(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t+=3)this.expandByPoint(Xi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,r=e.count;t<r;t++)this.expandByPoint(Xi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,r=e.length;t<r;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const r=Xi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(r),this.max.copy(e).add(r),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const r=e.geometry;if(r!==void 0){const l=r.getAttribute("position");if(t===!0&&l!==void 0&&e.isInstancedMesh!==!0)for(let c=0,d=l.count;c<d;c++)e.isMesh===!0?e.getVertexPosition(c,Xi):Xi.fromBufferAttribute(l,c),Xi.applyMatrix4(e.matrixWorld),this.expandByPoint(Xi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),vu.copy(e.boundingBox)):(r.boundingBox===null&&r.computeBoundingBox(),vu.copy(r.boundingBox)),vu.applyMatrix4(e.matrixWorld),this.union(vu)}const a=e.children;for(let l=0,c=a.length;l<c;l++)this.expandByObject(a[l],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Xi),Xi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,r;return e.normal.x>0?(t=e.normal.x*this.min.x,r=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,r=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,r+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,r+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,r+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,r+=e.normal.z*this.min.z),t<=-e.constant&&r>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Al),_u.subVectors(this.max,Al),io.subVectors(e.a,Al),ro.subVectors(e.b,Al),so.subVectors(e.c,Al),_s.subVectors(ro,io),ys.subVectors(so,ro),ra.subVectors(io,so);let t=[0,-_s.z,_s.y,0,-ys.z,ys.y,0,-ra.z,ra.y,_s.z,0,-_s.x,ys.z,0,-ys.x,ra.z,0,-ra.x,-_s.y,_s.x,0,-ys.y,ys.x,0,-ra.y,ra.x,0];return!Lf(t,io,ro,so,_u)||(t=[1,0,0,0,1,0,0,0,1],!Lf(t,io,ro,so,_u))?!1:(yu.crossVectors(_s,ys),t=[yu.x,yu.y,yu.z],Lf(t,io,ro,so,_u))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Xi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Xi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ur[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ur[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ur[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ur[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ur[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ur[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ur[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ur[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ur),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Ur=[new te,new te,new te,new te,new te,new te,new te,new te],Xi=new te,vu=new Vo,io=new te,ro=new te,so=new te,_s=new te,ys=new te,ra=new te,Al=new te,_u=new te,yu=new te,sa=new te;function Lf(i,e,t,r,a){for(let l=0,c=i.length-3;l<=c;l+=3){sa.fromArray(i,l);const d=a.x*Math.abs(sa.x)+a.y*Math.abs(sa.y)+a.z*Math.abs(sa.z),h=e.dot(sa),f=t.dot(sa),g=r.dot(sa);if(Math.max(-Math.max(h,f,g),Math.min(h,f,g))>d)return!1}return!0}const xn=new te,Su=new ut;let Fb=0;class _r extends zs{constructor(e,t,r=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Fb++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=r,this.usage=Kx,this.updateRanges=[],this.gpuType=pr,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,r){e*=this.itemSize,r*=t.itemSize;for(let a=0,l=this.itemSize;a<l;a++)this.array[e+a]=t.array[r+a];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,r=this.count;t<r;t++)Su.fromBufferAttribute(this,t),Su.applyMatrix3(e),this.setXY(t,Su.x,Su.y);else if(this.itemSize===3)for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.applyMatrix3(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}applyMatrix4(e){for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.applyMatrix4(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}applyNormalMatrix(e){for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.applyNormalMatrix(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}transformDirection(e){for(let t=0,r=this.count;t<r;t++)xn.fromBufferAttribute(this,t),xn.transformDirection(e),this.setXYZ(t,xn.x,xn.y,xn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let r=this.array[e*this.itemSize+t];return this.normalized&&(r=Cl(r,this.array)),r}setComponent(e,t,r){return this.normalized&&(r=li(r,this.array)),this.array[e*this.itemSize+t]=r,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Cl(t,this.array)),t}setX(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Cl(t,this.array)),t}setY(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Cl(t,this.array)),t}setZ(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Cl(t,this.array)),t}setW(e,t){return this.normalized&&(t=li(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,r){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array)),this.array[e+0]=t,this.array[e+1]=r,this}setXYZ(e,t,r,a){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this}setXYZW(e,t,r,a,l){return e*=this.itemSize,this.normalized&&(t=li(t,this.array),r=li(r,this.array),a=li(a,this.array),l=li(l,this.array)),this.array[e+0]=t,this.array[e+1]=r,this.array[e+2]=a,this.array[e+3]=l,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Kx&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}}class wy extends _r{constructor(e,t,r){super(new Uint16Array(e),t,r)}}class by extends _r{constructor(e,t,r){super(new Uint32Array(e),t,r)}}class In extends _r{constructor(e,t,r){super(new Float32Array(e),t,r)}}const Ob=new Vo,Pl=new te,Df=new te;class ic{constructor(e=new te,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const r=this.center;t!==void 0?r.copy(t):Ob.setFromPoints(e).getCenter(r);let a=0;for(let l=0,c=e.length;l<c;l++)a=Math.max(a,r.distanceToSquared(e[l]));return this.radius=Math.sqrt(a),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const r=this.center.distanceToSquared(e);return t.copy(e),r>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Pl.subVectors(e,this.center);const t=Pl.lengthSq();if(t>this.radius*this.radius){const r=Math.sqrt(t),a=(r-this.radius)*.5;this.center.addScaledVector(Pl,a/r),this.radius+=a}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Df.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Pl.copy(e.center).add(Df)),this.expandByPoint(Pl.copy(e.center).sub(Df))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let kb=0;const Ni=new rn,If=new Mn,ao=new te,vi=new Vo,Nl=new Vo,Rn=new te;class Mi extends zs{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:kb++}),this.uuid=nc(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(gb(e)?by:wy)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,r=0){this.groups.push({start:e,count:t,materialIndex:r})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const r=this.attributes.normal;if(r!==void 0){const l=new pt().getNormalMatrix(e);r.applyNormalMatrix(l),r.needsUpdate=!0}const a=this.attributes.tangent;return a!==void 0&&(a.transformDirection(e),a.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Ni.makeRotationFromQuaternion(e),this.applyMatrix4(Ni),this}rotateX(e){return Ni.makeRotationX(e),this.applyMatrix4(Ni),this}rotateY(e){return Ni.makeRotationY(e),this.applyMatrix4(Ni),this}rotateZ(e){return Ni.makeRotationZ(e),this.applyMatrix4(Ni),this}translate(e,t,r){return Ni.makeTranslation(e,t,r),this.applyMatrix4(Ni),this}scale(e,t,r){return Ni.makeScale(e,t,r),this.applyMatrix4(Ni),this}lookAt(e){return If.lookAt(e),If.updateMatrix(),this.applyMatrix4(If.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ao).negate(),this.translate(ao.x,ao.y,ao.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const r=[];for(let a=0,l=e.length;a<l;a++){const c=e[a];r.push(c.x,c.y,c.z||0)}this.setAttribute("position",new In(r,3))}else{const r=Math.min(e.length,t.count);for(let a=0;a<r;a++){const l=e[a];t.setXYZ(a,l.x,l.y,l.z||0)}e.length>t.count&&ot("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Vo);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Pt("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new te(-1/0,-1/0,-1/0),new te(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){const l=t[r];vi.setFromBufferAttribute(l),this.morphTargetsRelative?(Rn.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(Rn),Rn.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(Rn)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Pt('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new ic);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Pt("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new te,1/0);return}if(e){const r=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let l=0,c=t.length;l<c;l++){const d=t[l];Nl.setFromBufferAttribute(d),this.morphTargetsRelative?(Rn.addVectors(vi.min,Nl.min),vi.expandByPoint(Rn),Rn.addVectors(vi.max,Nl.max),vi.expandByPoint(Rn)):(vi.expandByPoint(Nl.min),vi.expandByPoint(Nl.max))}vi.getCenter(r);let a=0;for(let l=0,c=e.count;l<c;l++)Rn.fromBufferAttribute(e,l),a=Math.max(a,r.distanceToSquared(Rn));if(t)for(let l=0,c=t.length;l<c;l++){const d=t[l],h=this.morphTargetsRelative;for(let f=0,g=d.count;f<g;f++)Rn.fromBufferAttribute(d,f),h&&(ao.fromBufferAttribute(e,f),Rn.add(ao)),a=Math.max(a,r.distanceToSquared(Rn))}this.boundingSphere.radius=Math.sqrt(a),isNaN(this.boundingSphere.radius)&&Pt('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Pt("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const r=t.position,a=t.normal,l=t.uv;let c=this.getAttribute("tangent");(c===void 0||c.count!==r.count)&&(c=new _r(new Float32Array(4*r.count),4),this.setAttribute("tangent",c));const d=[],h=[];for(let w=0;w<r.count;w++)d[w]=new te,h[w]=new te;const f=new te,g=new te,p=new te,v=new ut,_=new ut,E=new ut,b=new te,M=new te;function S(w,D,z){f.fromBufferAttribute(r,w),g.fromBufferAttribute(r,D),p.fromBufferAttribute(r,z),v.fromBufferAttribute(l,w),_.fromBufferAttribute(l,D),E.fromBufferAttribute(l,z),g.sub(f),p.sub(f),_.sub(v),E.sub(v);const H=1/(_.x*E.y-E.x*_.y);isFinite(H)&&(b.copy(g).multiplyScalar(E.y).addScaledVector(p,-_.y).multiplyScalar(H),M.copy(p).multiplyScalar(_.x).addScaledVector(g,-E.x).multiplyScalar(H),d[w].add(b),d[D].add(b),d[z].add(b),h[w].add(M),h[D].add(M),h[z].add(M))}let P=this.groups;P.length===0&&(P=[{start:0,count:e.count}]);for(let w=0,D=P.length;w<D;++w){const z=P[w],H=z.start,X=z.count;for(let j=H,le=H+X;j<le;j+=3)S(e.getX(j+0),e.getX(j+1),e.getX(j+2))}const L=new te,C=new te,I=new te,N=new te;function U(w){I.fromBufferAttribute(a,w),N.copy(I);const D=d[w];L.copy(D),L.sub(I.multiplyScalar(I.dot(D))).normalize(),C.crossVectors(N,D);const H=C.dot(h[w])<0?-1:1;c.setXYZW(w,L.x,L.y,L.z,H)}for(let w=0,D=P.length;w<D;++w){const z=P[w],H=z.start,X=z.count;for(let j=H,le=H+X;j<le;j+=3)U(e.getX(j+0)),U(e.getX(j+1)),U(e.getX(j+2))}this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let r=this.getAttribute("normal");if(r===void 0||r.count!==t.count)r=new _r(new Float32Array(t.count*3),3),this.setAttribute("normal",r);else for(let v=0,_=r.count;v<_;v++)r.setXYZ(v,0,0,0);const a=new te,l=new te,c=new te,d=new te,h=new te,f=new te,g=new te,p=new te;if(e)for(let v=0,_=e.count;v<_;v+=3){const E=e.getX(v+0),b=e.getX(v+1),M=e.getX(v+2);a.fromBufferAttribute(t,E),l.fromBufferAttribute(t,b),c.fromBufferAttribute(t,M),g.subVectors(c,l),p.subVectors(a,l),g.cross(p),d.fromBufferAttribute(r,E),h.fromBufferAttribute(r,b),f.fromBufferAttribute(r,M),d.add(g),h.add(g),f.add(g),r.setXYZ(E,d.x,d.y,d.z),r.setXYZ(b,h.x,h.y,h.z),r.setXYZ(M,f.x,f.y,f.z)}else for(let v=0,_=t.count;v<_;v+=3)a.fromBufferAttribute(t,v+0),l.fromBufferAttribute(t,v+1),c.fromBufferAttribute(t,v+2),g.subVectors(c,l),p.subVectors(a,l),g.cross(p),r.setXYZ(v+0,g.x,g.y,g.z),r.setXYZ(v+1,g.x,g.y,g.z),r.setXYZ(v+2,g.x,g.y,g.z);this.normalizeNormals(),r.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,r=e.count;t<r;t++)Rn.fromBufferAttribute(e,t),Rn.normalize(),e.setXYZ(t,Rn.x,Rn.y,Rn.z)}toNonIndexed(){function e(d,h){const f=d.array,g=d.itemSize,p=d.normalized,v=new f.constructor(h.length*g);let _=0,E=0;for(let b=0,M=h.length;b<M;b++){d.isInterleavedBufferAttribute?_=h[b]*d.data.stride+d.offset:_=h[b]*g;for(let S=0;S<g;S++)v[E++]=f[_++]}return new _r(v,g,p)}if(this.index===null)return ot("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Mi,r=this.index.array,a=this.attributes;for(const d in a){const h=a[d],f=e(h,r);t.setAttribute(d,f)}const l=this.morphAttributes;for(const d in l){const h=[],f=l[d];for(let g=0,p=f.length;g<p;g++){const v=f[g],_=e(v,r);h.push(_)}t.morphAttributes[d]=h}t.morphTargetsRelative=this.morphTargetsRelative;const c=this.groups;for(let d=0,h=c.length;d<h;d++){const f=c[d];t.addGroup(f.start,f.count,f.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const h=this.parameters;for(const f in h)h[f]!==void 0&&(e[f]=h[f]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const r=this.attributes;for(const h in r){const f=r[h];e.data.attributes[h]=f.toJSON(e.data)}const a={};let l=!1;for(const h in this.morphAttributes){const f=this.morphAttributes[h],g=[];for(let p=0,v=f.length;p<v;p++){const _=f[p];g.push(_.toJSON(e.data))}g.length>0&&(a[h]=g,l=!0)}l&&(e.data.morphAttributes=a,e.data.morphTargetsRelative=this.morphTargetsRelative);const c=this.groups;c.length>0&&(e.data.groups=JSON.parse(JSON.stringify(c)));const d=this.boundingSphere;return d!==null&&(e.data.boundingSphere=d.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const r=e.index;r!==null&&this.setIndex(r.clone());const a=e.attributes;for(const f in a){const g=a[f];this.setAttribute(f,g.clone(t))}const l=e.morphAttributes;for(const f in l){const g=[],p=l[f];for(let v=0,_=p.length;v<_;v++)g.push(p[v].clone(t));this.morphAttributes[f]=g}this.morphTargetsRelative=e.morphTargetsRelative;const c=e.groups;for(let f=0,g=c.length;f<g;f++){const p=c[f];this.addGroup(p.start,p.count,p.materialIndex)}const d=e.boundingBox;d!==null&&(this.boundingBox=d.clone());const h=e.boundingSphere;return h!==null&&(this.boundingSphere=h.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}let zb=0;class Sr extends zs{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:zb++}),this.uuid=nc(),this.name="",this.type="Material",this.blending=go,this.side=Os,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=vp,this.blendDst=_p,this.blendEquation=la,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new gt(0,0,0),this.blendAlpha=0,this.depthFunc=Do,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=qx,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ya,this.stencilZFail=Ya,this.stencilZPass=Ya,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const r=e[t];if(r===void 0){ot(`Material: parameter '${t}' has value of undefined.`);continue}const a=this[t];if(a===void 0){ot(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}a&&a.isColor?a.set(r):a&&a.isVector2&&r&&r.isVector2||a&&a.isEuler&&r&&r.isEuler||a&&a.isVector3&&r&&r.isVector3?a.copy(r):this[t]=r}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const r={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.color&&this.color.isColor&&(r.color=this.color.getHex()),this.roughness!==void 0&&(r.roughness=this.roughness),this.metalness!==void 0&&(r.metalness=this.metalness),this.sheen!==void 0&&(r.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(r.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(r.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(r.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(r.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(r.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(r.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(r.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(r.shininess=this.shininess),this.clearcoat!==void 0&&(r.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(r.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(r.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(r.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(r.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,r.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(r.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(r.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(r.dispersion=this.dispersion),this.iridescence!==void 0&&(r.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(r.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(r.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(r.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(r.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(r.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(r.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(r.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(r.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(r.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(r.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(r.lightMap=this.lightMap.toJSON(e).uuid,r.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(r.aoMap=this.aoMap.toJSON(e).uuid,r.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(r.bumpMap=this.bumpMap.toJSON(e).uuid,r.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(r.normalMap=this.normalMap.toJSON(e).uuid,r.normalMapType=this.normalMapType,r.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(r.displacementMap=this.displacementMap.toJSON(e).uuid,r.displacementScale=this.displacementScale,r.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(r.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(r.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(r.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(r.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(r.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(r.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(r.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(r.combine=this.combine)),this.envMapRotation!==void 0&&(r.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(r.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(r.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(r.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(r.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(r.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(r.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(r.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(r.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(r.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(r.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(r.size=this.size),this.shadowSide!==null&&(r.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(r.sizeAttenuation=this.sizeAttenuation),this.blending!==go&&(r.blending=this.blending),this.side!==Os&&(r.side=this.side),this.vertexColors===!0&&(r.vertexColors=!0),this.opacity<1&&(r.opacity=this.opacity),this.transparent===!0&&(r.transparent=!0),this.blendSrc!==vp&&(r.blendSrc=this.blendSrc),this.blendDst!==_p&&(r.blendDst=this.blendDst),this.blendEquation!==la&&(r.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(r.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(r.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(r.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(r.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(r.blendAlpha=this.blendAlpha),this.depthFunc!==Do&&(r.depthFunc=this.depthFunc),this.depthTest===!1&&(r.depthTest=this.depthTest),this.depthWrite===!1&&(r.depthWrite=this.depthWrite),this.colorWrite===!1&&(r.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(r.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==qx&&(r.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(r.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(r.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ya&&(r.stencilFail=this.stencilFail),this.stencilZFail!==Ya&&(r.stencilZFail=this.stencilZFail),this.stencilZPass!==Ya&&(r.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(r.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(r.rotation=this.rotation),this.polygonOffset===!0&&(r.polygonOffset=!0),this.polygonOffsetFactor!==0&&(r.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(r.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(r.linewidth=this.linewidth),this.dashSize!==void 0&&(r.dashSize=this.dashSize),this.gapSize!==void 0&&(r.gapSize=this.gapSize),this.scale!==void 0&&(r.scale=this.scale),this.dithering===!0&&(r.dithering=!0),this.alphaTest>0&&(r.alphaTest=this.alphaTest),this.alphaHash===!0&&(r.alphaHash=!0),this.alphaToCoverage===!0&&(r.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(r.premultipliedAlpha=!0),this.forceSinglePass===!0&&(r.forceSinglePass=!0),this.allowOverride===!1&&(r.allowOverride=!1),this.wireframe===!0&&(r.wireframe=!0),this.wireframeLinewidth>1&&(r.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(r.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(r.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(r.flatShading=!0),this.visible===!1&&(r.visible=!1),this.toneMapped===!1&&(r.toneMapped=!1),this.fog===!1&&(r.fog=!1),Object.keys(this.userData).length>0&&(r.userData=this.userData);function a(l){const c=[];for(const d in l){const h=l[d];delete h.metadata,c.push(h)}return c}if(t){const l=a(e.textures),c=a(e.images);l.length>0&&(r.textures=l),c.length>0&&(r.images=c)}return r}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new gt().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let r=e.normalScale;Array.isArray(r)===!1&&(r=[r,r]),this.normalScale=new ut().fromArray(r)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new ut().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let r=null;if(t!==null){const a=t.length;r=new Array(a);for(let l=0;l!==a;++l)r[l]=t[l].clone()}return this.clippingPlanes=r,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const Fr=new te,Uf=new te,Mu=new te,Ss=new te,Ff=new te,Eu=new te,Of=new te;class yd{constructor(e=new te,t=new te(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Fr)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const r=t.dot(this.direction);return r<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,r)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=Fr.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Fr.copy(this.origin).addScaledVector(this.direction,t),Fr.distanceToSquared(e))}distanceSqToSegment(e,t,r,a){Uf.copy(e).add(t).multiplyScalar(.5),Mu.copy(t).sub(e).normalize(),Ss.copy(this.origin).sub(Uf);const l=e.distanceTo(t)*.5,c=-this.direction.dot(Mu),d=Ss.dot(this.direction),h=-Ss.dot(Mu),f=Ss.lengthSq(),g=Math.abs(1-c*c);let p,v,_,E;if(g>0)if(p=c*h-d,v=c*d-h,E=l*g,p>=0)if(v>=-E)if(v<=E){const b=1/g;p*=b,v*=b,_=p*(p+c*v+2*d)+v*(c*p+v+2*h)+f}else v=l,p=Math.max(0,-(c*v+d)),_=-p*p+v*(v+2*h)+f;else v=-l,p=Math.max(0,-(c*v+d)),_=-p*p+v*(v+2*h)+f;else v<=-E?(p=Math.max(0,-(-c*l+d)),v=p>0?-l:Math.min(Math.max(-l,-h),l),_=-p*p+v*(v+2*h)+f):v<=E?(p=0,v=Math.min(Math.max(-l,-h),l),_=v*(v+2*h)+f):(p=Math.max(0,-(c*l+d)),v=p>0?l:Math.min(Math.max(-l,-h),l),_=-p*p+v*(v+2*h)+f);else v=c>0?-l:l,p=Math.max(0,-(c*v+d)),_=-p*p+v*(v+2*h)+f;return r&&r.copy(this.origin).addScaledVector(this.direction,p),a&&a.copy(Uf).addScaledVector(Mu,v),_}intersectSphere(e,t){Fr.subVectors(e.center,this.origin);const r=Fr.dot(this.direction),a=Fr.dot(Fr)-r*r,l=e.radius*e.radius;if(a>l)return null;const c=Math.sqrt(l-a),d=r-c,h=r+c;return h<0?null:d<0?this.at(h,t):this.at(d,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const r=-(this.origin.dot(e.normal)+e.constant)/t;return r>=0?r:null}intersectPlane(e,t){const r=this.distanceToPlane(e);return r===null?null:this.at(r,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let r,a,l,c,d,h;const f=1/this.direction.x,g=1/this.direction.y,p=1/this.direction.z,v=this.origin;return f>=0?(r=(e.min.x-v.x)*f,a=(e.max.x-v.x)*f):(r=(e.max.x-v.x)*f,a=(e.min.x-v.x)*f),g>=0?(l=(e.min.y-v.y)*g,c=(e.max.y-v.y)*g):(l=(e.max.y-v.y)*g,c=(e.min.y-v.y)*g),r>c||l>a||((l>r||isNaN(r))&&(r=l),(c<a||isNaN(a))&&(a=c),p>=0?(d=(e.min.z-v.z)*p,h=(e.max.z-v.z)*p):(d=(e.max.z-v.z)*p,h=(e.min.z-v.z)*p),r>h||d>a)||((d>r||r!==r)&&(r=d),(h<a||a!==a)&&(a=h),a<0)?null:this.at(r>=0?r:a,t)}intersectsBox(e){return this.intersectBox(e,Fr)!==null}intersectTriangle(e,t,r,a,l){Ff.subVectors(t,e),Eu.subVectors(r,e),Of.crossVectors(Ff,Eu);let c=this.direction.dot(Of),d;if(c>0){if(a)return null;d=1}else if(c<0)d=-1,c=-c;else return null;Ss.subVectors(this.origin,e);const h=d*this.direction.dot(Eu.crossVectors(Ss,Eu));if(h<0)return null;const f=d*this.direction.dot(Ff.cross(Ss));if(f<0||h+f>c)return null;const g=-d*Ss.dot(Of);return g<0?null:this.at(g/c,l)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ty extends Sr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new gt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qr,this.combine=Am,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const uv=new rn,aa=new yd,wu=new ic,dv=new te,bu=new te,Tu=new te,Cu=new te,kf=new te,Ru=new te,hv=new te,Au=new te;class Qi extends Mn{constructor(e=new Mi,t=new Ty){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}getVertexPosition(e,t){const r=this.geometry,a=r.attributes.position,l=r.morphAttributes.position,c=r.morphTargetsRelative;t.fromBufferAttribute(a,e);const d=this.morphTargetInfluences;if(l&&d){Ru.set(0,0,0);for(let h=0,f=l.length;h<f;h++){const g=d[h],p=l[h];g!==0&&(kf.fromBufferAttribute(p,e),c?Ru.addScaledVector(kf,g):Ru.addScaledVector(kf.sub(t),g))}t.add(Ru)}return t}raycast(e,t){const r=this.geometry,a=this.material,l=this.matrixWorld;a!==void 0&&(r.boundingSphere===null&&r.computeBoundingSphere(),wu.copy(r.boundingSphere),wu.applyMatrix4(l),aa.copy(e.ray).recast(e.near),!(wu.containsPoint(aa.origin)===!1&&(aa.intersectSphere(wu,dv)===null||aa.origin.distanceToSquared(dv)>(e.far-e.near)**2))&&(uv.copy(l).invert(),aa.copy(e.ray).applyMatrix4(uv),!(r.boundingBox!==null&&aa.intersectsBox(r.boundingBox)===!1)&&this._computeIntersections(e,t,aa)))}_computeIntersections(e,t,r){let a;const l=this.geometry,c=this.material,d=l.index,h=l.attributes.position,f=l.attributes.uv,g=l.attributes.uv1,p=l.attributes.normal,v=l.groups,_=l.drawRange;if(d!==null)if(Array.isArray(c))for(let E=0,b=v.length;E<b;E++){const M=v[E],S=c[M.materialIndex],P=Math.max(M.start,_.start),L=Math.min(d.count,Math.min(M.start+M.count,_.start+_.count));for(let C=P,I=L;C<I;C+=3){const N=d.getX(C),U=d.getX(C+1),w=d.getX(C+2);a=Pu(this,S,e,r,f,g,p,N,U,w),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=M.materialIndex,t.push(a))}}else{const E=Math.max(0,_.start),b=Math.min(d.count,_.start+_.count);for(let M=E,S=b;M<S;M+=3){const P=d.getX(M),L=d.getX(M+1),C=d.getX(M+2);a=Pu(this,c,e,r,f,g,p,P,L,C),a&&(a.faceIndex=Math.floor(M/3),t.push(a))}}else if(h!==void 0)if(Array.isArray(c))for(let E=0,b=v.length;E<b;E++){const M=v[E],S=c[M.materialIndex],P=Math.max(M.start,_.start),L=Math.min(h.count,Math.min(M.start+M.count,_.start+_.count));for(let C=P,I=L;C<I;C+=3){const N=C,U=C+1,w=C+2;a=Pu(this,S,e,r,f,g,p,N,U,w),a&&(a.faceIndex=Math.floor(C/3),a.face.materialIndex=M.materialIndex,t.push(a))}}else{const E=Math.max(0,_.start),b=Math.min(h.count,_.start+_.count);for(let M=E,S=b;M<S;M+=3){const P=M,L=M+1,C=M+2;a=Pu(this,c,e,r,f,g,p,P,L,C),a&&(a.faceIndex=Math.floor(M/3),t.push(a))}}}}function Bb(i,e,t,r,a,l,c,d){let h;if(e.side===hi?h=r.intersectTriangle(c,l,a,!0,d):h=r.intersectTriangle(a,l,c,e.side===Os,d),h===null)return null;Au.copy(d),Au.applyMatrix4(i.matrixWorld);const f=t.ray.origin.distanceTo(Au);return f<t.near||f>t.far?null:{distance:f,point:Au.clone(),object:i}}function Pu(i,e,t,r,a,l,c,d,h,f){i.getVertexPosition(d,bu),i.getVertexPosition(h,Tu),i.getVertexPosition(f,Cu);const g=Bb(i,e,t,r,bu,Tu,Cu,hv);if(g){const p=new te;qi.getBarycoord(hv,bu,Tu,Cu,p),a&&(g.uv=qi.getInterpolatedAttribute(a,d,h,f,p,new ut)),l&&(g.uv1=qi.getInterpolatedAttribute(l,d,h,f,p,new ut)),c&&(g.normal=qi.getInterpolatedAttribute(c,d,h,f,p,new te),g.normal.dot(r.direction)>0&&g.normal.multiplyScalar(-1));const v={a:d,b:h,c:f,normal:new te,materialIndex:0};qi.getNormal(bu,Tu,Cu,v.normal),g.face=v,g.barycoord=p}return g}class Hb extends Wn{constructor(e=null,t=1,r=1,a,l,c,d,h,f=Un,g=Un,p,v){super(null,c,d,h,f,g,a,l,p,v),this.isDataTexture=!0,this.image={data:e,width:t,height:r},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const zf=new te,Vb=new te,Gb=new pt;class ws{constructor(e=new te(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,r,a){return this.normal.set(e,t,r),this.constant=a,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,r){const a=zf.subVectors(r,t).cross(Vb.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(a,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,r=!0){const a=e.delta(zf),l=this.normal.dot(a);if(l===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const c=-(e.start.dot(this.normal)+this.constant)/l;return r===!0&&(c<0||c>1)?null:t.copy(e.start).addScaledVector(a,c)}intersectsLine(e){const t=this.distanceToPoint(e.start),r=this.distanceToPoint(e.end);return t<0&&r>0||r<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const r=t||Gb.getNormalMatrix(e),a=this.coplanarPoint(zf).applyMatrix4(e),l=this.normal.applyMatrix3(r).normalize();return this.constant=-a.dot(l),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const oa=new ic,jb=new ut(.5,.5),Nu=new te;class Bm{constructor(e=new ws,t=new ws,r=new ws,a=new ws,l=new ws,c=new ws){this.planes=[e,t,r,a,l,c]}set(e,t,r,a,l,c){const d=this.planes;return d[0].copy(e),d[1].copy(t),d[2].copy(r),d[3].copy(a),d[4].copy(l),d[5].copy(c),this}copy(e){const t=this.planes;for(let r=0;r<6;r++)t[r].copy(e.planes[r]);return this}setFromProjectionMatrix(e,t=mr,r=!1){const a=this.planes,l=e.elements,c=l[0],d=l[1],h=l[2],f=l[3],g=l[4],p=l[5],v=l[6],_=l[7],E=l[8],b=l[9],M=l[10],S=l[11],P=l[12],L=l[13],C=l[14],I=l[15];if(a[0].setComponents(f-c,_-g,S-E,I-P).normalize(),a[1].setComponents(f+c,_+g,S+E,I+P).normalize(),a[2].setComponents(f+d,_+p,S+b,I+L).normalize(),a[3].setComponents(f-d,_-p,S-b,I-L).normalize(),r)a[4].setComponents(h,v,M,C).normalize(),a[5].setComponents(f-h,_-v,S-M,I-C).normalize();else if(a[4].setComponents(f-h,_-v,S-M,I-C).normalize(),t===mr)a[5].setComponents(f+h,_+v,S+M,I+C).normalize();else if(t===$l)a[5].setComponents(h,v,M,C).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),oa.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),oa.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(oa)}intersectsSprite(e){oa.center.set(0,0,0);const t=jb.distanceTo(e.center);return oa.radius=.7071067811865476+t,oa.applyMatrix4(e.matrixWorld),this.intersectsSphere(oa)}intersectsSphere(e){const t=this.planes,r=e.center,a=-e.radius;for(let l=0;l<6;l++)if(t[l].distanceToPoint(r)<a)return!1;return!0}intersectsBox(e){const t=this.planes;for(let r=0;r<6;r++){const a=t[r];if(Nu.x=a.normal.x>0?e.max.x:e.min.x,Nu.y=a.normal.y>0?e.max.y:e.min.y,Nu.z=a.normal.z>0?e.max.z:e.min.z,a.distanceToPoint(Nu)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let r=0;r<6;r++)if(t[r].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Qu extends Sr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new gt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const cd=new te,ud=new te,fv=new rn,Ll=new yd,Lu=new ic,Bf=new te,pv=new te;class Wb extends Mn{constructor(e=new Mi,t=new Qu){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[0];for(let a=1,l=t.count;a<l;a++)cd.fromBufferAttribute(t,a-1),ud.fromBufferAttribute(t,a),r[a]=r[a-1],r[a]+=cd.distanceTo(ud);e.setAttribute("lineDistance",new In(r,1))}else ot("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Line.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Lu.copy(r.boundingSphere),Lu.applyMatrix4(a),Lu.radius+=l,e.ray.intersectsSphere(Lu)===!1)return;fv.copy(a).invert(),Ll.copy(e.ray).applyMatrix4(fv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=this.isLineSegments?2:1,g=r.index,v=r.attributes.position;if(g!==null){const _=Math.max(0,c.start),E=Math.min(g.count,c.start+c.count);for(let b=_,M=E-1;b<M;b+=f){const S=g.getX(b),P=g.getX(b+1),L=Du(this,e,Ll,h,S,P,b);L&&t.push(L)}if(this.isLineLoop){const b=g.getX(E-1),M=g.getX(_),S=Du(this,e,Ll,h,b,M,E-1);S&&t.push(S)}}else{const _=Math.max(0,c.start),E=Math.min(v.count,c.start+c.count);for(let b=_,M=E-1;b<M;b+=f){const S=Du(this,e,Ll,h,b,b+1,b);S&&t.push(S)}if(this.isLineLoop){const b=Du(this,e,Ll,h,E-1,_,E-1);b&&t.push(b)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function Du(i,e,t,r,a,l,c){const d=i.geometry.attributes.position;if(cd.fromBufferAttribute(d,a),ud.fromBufferAttribute(d,l),t.distanceSqToSegment(cd,ud,Bf,pv)>r)return;Bf.applyMatrix4(i.matrixWorld);const f=e.ray.origin.distanceTo(Bf);if(!(f<e.near||f>e.far))return{distance:f,point:pv.clone().applyMatrix4(i.matrixWorld),index:c,face:null,faceIndex:null,barycoord:null,object:i}}const mv=new te,gv=new te;class xv extends Wb{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,r=[];for(let a=0,l=t.count;a<l;a+=2)mv.fromBufferAttribute(t,a),gv.fromBufferAttribute(t,a+1),r[a]=a===0?0:r[a-1],r[a+1]=r[a]+mv.distanceTo(gv);e.setAttribute("lineDistance",new In(r,1))}else ot("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class kl extends Sr{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new gt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const vv=new rn,am=new yd,Iu=new ic,Uu=new te;class Hf extends Mn{constructor(e=new Mi,t=new kl){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){const r=this.geometry,a=this.matrixWorld,l=e.params.Points.threshold,c=r.drawRange;if(r.boundingSphere===null&&r.computeBoundingSphere(),Iu.copy(r.boundingSphere),Iu.applyMatrix4(a),Iu.radius+=l,e.ray.intersectsSphere(Iu)===!1)return;vv.copy(a).invert(),am.copy(e.ray).applyMatrix4(vv);const d=l/((this.scale.x+this.scale.y+this.scale.z)/3),h=d*d,f=r.index,p=r.attributes.position;if(f!==null){const v=Math.max(0,c.start),_=Math.min(f.count,c.start+c.count);for(let E=v,b=_;E<b;E++){const M=f.getX(E);Uu.fromBufferAttribute(p,M),_v(Uu,M,h,a,e,t,this)}}else{const v=Math.max(0,c.start),_=Math.min(p.count,c.start+c.count);for(let E=v,b=_;E<b;E++)Uu.fromBufferAttribute(p,E),_v(Uu,E,h,a,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,r=Object.keys(t);if(r.length>0){const a=t[r[0]];if(a!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let l=0,c=a.length;l<c;l++){const d=a[l].name||String(l);this.morphTargetInfluences.push(0),this.morphTargetDictionary[d]=l}}}}}function _v(i,e,t,r,a,l,c){const d=am.distanceSqToPoint(i);if(d<t){const h=new te;am.closestPointToPoint(i,h),h.applyMatrix4(r);const f=a.ray.origin.distanceTo(h);if(f<a.near||f>a.far)return;l.push({distance:f,distanceToRay:Math.sqrt(d),point:h,index:e,face:null,faceIndex:null,barycoord:null,object:c})}}class Cy extends Wn{constructor(e=[],t=Ea,r,a,l,c,d,h,f,g){super(e,t,r,a,l,c,d,h,f,g),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Uo extends Wn{constructor(e,t,r=yr,a,l,c,d=Un,h=Un,f,g=Yr,p=1){if(g!==Yr&&g!==ha)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const v={width:e,height:t,depth:p};super(v,a,l,c,d,h,g,r,f),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new zm(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Xb extends Uo{constructor(e,t=yr,r=Ea,a,l,c=Un,d=Un,h,f=Yr){const g={width:e,height:e,depth:1},p=[g,g,g,g,g,g];super(e,e,t,r,a,l,c,d,h,f),this.image=p,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Ry extends Wn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class rc extends Mi{constructor(e=1,t=1,r=1,a=1,l=1,c=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:r,widthSegments:a,heightSegments:l,depthSegments:c};const d=this;a=Math.floor(a),l=Math.floor(l),c=Math.floor(c);const h=[],f=[],g=[],p=[];let v=0,_=0;E("z","y","x",-1,-1,r,t,e,c,l,0),E("z","y","x",1,-1,r,t,-e,c,l,1),E("x","z","y",1,1,e,r,t,a,c,2),E("x","z","y",1,-1,e,r,-t,a,c,3),E("x","y","z",1,-1,e,t,r,a,l,4),E("x","y","z",-1,-1,e,t,-r,a,l,5),this.setIndex(h),this.setAttribute("position",new In(f,3)),this.setAttribute("normal",new In(g,3)),this.setAttribute("uv",new In(p,2));function E(b,M,S,P,L,C,I,N,U,w,D){const z=C/U,H=I/w,X=C/2,j=I/2,le=N/2,$=U+1,ue=w+1;let J=0,K=0;const re=new te;for(let de=0;de<ue;de++){const F=de*H-j;for(let ee=0;ee<$;ee++){const Ce=ee*z-X;re[b]=Ce*P,re[M]=F*L,re[S]=le,f.push(re.x,re.y,re.z),re[b]=0,re[M]=0,re[S]=N>0?1:-1,g.push(re.x,re.y,re.z),p.push(ee/U),p.push(1-de/w),J+=1}}for(let de=0;de<w;de++)for(let F=0;F<U;F++){const ee=v+F+$*de,Ce=v+F+$*(de+1),Ve=v+(F+1)+$*(de+1),Ge=v+(F+1)+$*de;h.push(ee,Ce,Ge),h.push(Ce,Ve,Ge),K+=6}d.addGroup(_,K,D),_+=K,v+=J}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new rc(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Sd extends Mi{constructor(e=1,t=1,r=1,a=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:r,heightSegments:a};const l=e/2,c=t/2,d=Math.floor(r),h=Math.floor(a),f=d+1,g=h+1,p=e/d,v=t/h,_=[],E=[],b=[],M=[];for(let S=0;S<g;S++){const P=S*v-c;for(let L=0;L<f;L++){const C=L*p-l;E.push(C,-P,0),b.push(0,0,1),M.push(L/d),M.push(1-S/h)}}for(let S=0;S<h;S++)for(let P=0;P<d;P++){const L=P+f*S,C=P+f*(S+1),I=P+1+f*(S+1),N=P+1+f*S;_.push(L,C,N),_.push(C,I,N)}this.setIndex(_),this.setAttribute("position",new In(E,3)),this.setAttribute("normal",new In(b,3)),this.setAttribute("uv",new In(M,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Sd(e.width,e.height,e.widthSegments,e.heightSegments)}}function Fo(i){const e={};for(const t in i){e[t]={};for(const r in i[t]){const a=i[t][r];if(yv(a))a.isRenderTargetTexture?(ot("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][r]=null):e[t][r]=a.clone();else if(Array.isArray(a))if(yv(a[0])){const l=[];for(let c=0,d=a.length;c<d;c++)l[c]=a[c].clone();e[t][r]=l}else e[t][r]=a.slice();else e[t][r]=a}}return e}function Yn(i){const e={};for(let t=0;t<i.length;t++){const r=Fo(i[t]);for(const a in r)e[a]=r[a]}return e}function yv(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function $b(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Ay(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Tt.workingColorSpace}const qb={clone:Fo,merge:Yn};var Kb=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Yb=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Mr extends Sr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Kb,this.fragmentShader=Yb,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Fo(e.uniforms),this.uniformsGroups=$b(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const a in this.uniforms){const c=this.uniforms[a].value;c&&c.isTexture?t.uniforms[a]={type:"t",value:c.toJSON(e).uuid}:c&&c.isColor?t.uniforms[a]={type:"c",value:c.getHex()}:c&&c.isVector2?t.uniforms[a]={type:"v2",value:c.toArray()}:c&&c.isVector3?t.uniforms[a]={type:"v3",value:c.toArray()}:c&&c.isVector4?t.uniforms[a]={type:"v4",value:c.toArray()}:c&&c.isMatrix3?t.uniforms[a]={type:"m3",value:c.toArray()}:c&&c.isMatrix4?t.uniforms[a]={type:"m4",value:c.toArray()}:t.uniforms[a]={value:c}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const r={};for(const a in this.extensions)this.extensions[a]===!0&&(r[a]=!0);return Object.keys(r).length>0&&(t.extensions=r),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const r in e.uniforms){const a=e.uniforms[r];switch(this.uniforms[r]={},a.type){case"t":this.uniforms[r].value=t[a.value]||null;break;case"c":this.uniforms[r].value=new gt().setHex(a.value);break;case"v2":this.uniforms[r].value=new ut().fromArray(a.value);break;case"v3":this.uniforms[r].value=new te().fromArray(a.value);break;case"v4":this.uniforms[r].value=new cn().fromArray(a.value);break;case"m3":this.uniforms[r].value=new pt().fromArray(a.value);break;case"m4":this.uniforms[r].value=new rn().fromArray(a.value);break;default:this.uniforms[r].value=a.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const r in e.extensions)this.extensions[r]=e.extensions[r];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class Qb extends Mr{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Vf extends Sr{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new gt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ad,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qr,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Zb extends Sr{constructor(e){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new gt(16777215),this.specular=new gt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new gt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=ad,this.normalScale=new ut(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Qr,this.combine=Am,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Jb extends Sr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=lb,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class eT extends Sr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const Bl={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Sv(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Sv(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Sv(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class tT{constructor(e,t,r){const a=this;let l=!1,c=0,d=0,h;const f=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=r,this._abortController=null,this.itemStart=function(g){d++,l===!1&&a.onStart!==void 0&&a.onStart(g,c,d),l=!0},this.itemEnd=function(g){c++,a.onProgress!==void 0&&a.onProgress(g,c,d),c===d&&(l=!1,a.onLoad!==void 0&&a.onLoad())},this.itemError=function(g){a.onError!==void 0&&a.onError(g)},this.resolveURL=function(g){return g=g.normalize("NFC"),h?h(g):g},this.setURLModifier=function(g){return h=g,this},this.addHandler=function(g,p){return f.push(g,p),this},this.removeHandler=function(g){const p=f.indexOf(g);return p!==-1&&f.splice(p,2),this},this.getHandler=function(g){for(let p=0,v=f.length;p<v;p+=2){const _=f[p],E=f[p+1];if(_.global&&(_.lastIndex=0),_.test(g))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const nT=new tT;class sc{constructor(e){this.manager=e!==void 0?e:nT,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const r=this;return new Promise(function(a,l){r.load(e,a,t,l)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}sc.DEFAULT_MATERIAL_NAME="__DEFAULT";const Or={};class iT extends Error{constructor(e,t){super(e),this.response=t}}class rT extends sc{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,r,a){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=Bl.get(`file:${e}`);if(l!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(l),this.manager.itemEnd(e)},0);return}if(Or[e]!==void 0){Or[e].push({onLoad:t,onProgress:r,onError:a});return}Or[e]=[],Or[e].push({onLoad:t,onProgress:r,onError:a});const c=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),d=this.mimeType,h=this.responseType;fetch(c).then(f=>{if(f.status===200||f.status===0){if(f.status===0&&ot("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||f.body===void 0||f.body.getReader===void 0)return f;const g=Or[e],p=f.body.getReader(),v=f.headers.get("X-File-Size")||f.headers.get("Content-Length"),_=v?parseInt(v):0,E=_!==0;let b=0;const M=new ReadableStream({start(S){P();function P(){p.read().then(({done:L,value:C})=>{if(L)S.close();else{b+=C.byteLength;const I=new ProgressEvent("progress",{lengthComputable:E,loaded:b,total:_});for(let N=0,U=g.length;N<U;N++){const w=g[N];w.onProgress&&w.onProgress(I)}S.enqueue(C),P()}},L=>{S.error(L)})}}});return new Response(M)}else throw new iT(`fetch for "${f.url}" responded with ${f.status}: ${f.statusText}`,f)}).then(f=>{switch(h){case"arraybuffer":return f.arrayBuffer();case"blob":return f.blob();case"document":return f.text().then(g=>new DOMParser().parseFromString(g,d));case"json":return f.json();default:if(d==="")return f.text();{const p=/charset="?([^;"\s]*)"?/i.exec(d),v=p&&p[1]?p[1].toLowerCase():void 0,_=new TextDecoder(v);return f.arrayBuffer().then(E=>_.decode(E))}}}).then(f=>{Bl.add(`file:${e}`,f);const g=Or[e];delete Or[e];for(let p=0,v=g.length;p<v;p++){const _=g[p];_.onLoad&&_.onLoad(f)}}).catch(f=>{const g=Or[e];if(g===void 0)throw this.manager.itemError(e),f;delete Or[e];for(let p=0,v=g.length;p<v;p++){const _=g[p];_.onError&&_.onError(f)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const oo=new WeakMap;class sT extends sc{constructor(e){super(e)}load(e,t,r,a){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const l=this,c=Bl.get(`image:${e}`);if(c!==void 0){if(c.complete===!0)l.manager.itemStart(e),setTimeout(function(){t&&t(c),l.manager.itemEnd(e)},0);else{let p=oo.get(c);p===void 0&&(p=[],oo.set(c,p)),p.push({onLoad:t,onError:a})}return c}const d=ql("img");function h(){g(),t&&t(this);const p=oo.get(this)||[];for(let v=0;v<p.length;v++){const _=p[v];_.onLoad&&_.onLoad(this)}oo.delete(this),l.manager.itemEnd(e)}function f(p){g(),a&&a(p),Bl.remove(`image:${e}`);const v=oo.get(this)||[];for(let _=0;_<v.length;_++){const E=v[_];E.onError&&E.onError(p)}oo.delete(this),l.manager.itemError(e),l.manager.itemEnd(e)}function g(){d.removeEventListener("load",h,!1),d.removeEventListener("error",f,!1)}return d.addEventListener("load",h,!1),d.addEventListener("error",f,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(d.crossOrigin=this.crossOrigin),Bl.add(`image:${e}`,d),l.manager.itemStart(e),d.src=e,d}}class aT extends sc{constructor(e){super(e)}load(e,t,r,a){const l=new Wn,c=new sT(this.manager);return c.setCrossOrigin(this.crossOrigin),c.setPath(this.path),c.load(e,function(d){l.image=d,l.needsUpdate=!0,t!==void 0&&t(l)},r,a),l}}class Hm extends Mn{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new gt(e),this.intensity=t}dispose(){this.dispatchEvent({type:"dispose"})}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class oT extends Hm{constructor(e,t,r){super(e,r),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(Mn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new gt(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const Gf=new rn,Mv=new te,Ev=new te;class lT{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ut(512,512),this.mapType=Si,this.map=null,this.mapPass=null,this.matrix=new rn,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Bm,this._frameExtents=new ut(1,1),this._viewportCount=1,this._viewports=[new cn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,r=this.matrix;Mv.setFromMatrixPosition(e.matrixWorld),t.position.copy(Mv),Ev.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Ev),t.updateMatrixWorld(),Gf.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Gf,t.coordinateSystem,t.reversedDepth),t.coordinateSystem===$l||t.reversedDepth?r.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):r.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),r.multiply(Gf)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Fu=new te,Ou=new ks,sr=new te;class Py extends Mn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rn,this.projectionMatrix=new rn,this.projectionMatrixInverse=new rn,this.coordinateSystem=mr,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Fu,Ou,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fu,Ou,sr.set(1,1,1)).invert()}updateWorldMatrix(e,t,r=!1){super.updateWorldMatrix(e,t,r),this.matrixWorld.decompose(Fu,Ou,sr),sr.x===1&&sr.y===1&&sr.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Fu,Ou,sr.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const Ms=new te,wv=new ut,bv=new ut;class Ii extends Py{constructor(e=50,t=1,r=.1,a=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=r,this.far=a,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=sm*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Yu*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return sm*2*Math.atan(Math.tan(Yu*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,r){Ms.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ms.x,Ms.y).multiplyScalar(-e/Ms.z),Ms.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),r.set(Ms.x,Ms.y).multiplyScalar(-e/Ms.z)}getViewSize(e,t){return this.getViewBounds(e,wv,bv),t.subVectors(bv,wv)}setViewOffset(e,t,r,a,l,c){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Yu*.5*this.fov)/this.zoom,r=2*t,a=this.aspect*r,l=-.5*a;const c=this.view;if(this.view!==null&&this.view.enabled){const h=c.fullWidth,f=c.fullHeight;l+=c.offsetX*a/h,t-=c.offsetY*r/f,a*=c.width/h,r*=c.height/f}const d=this.filmOffset;d!==0&&(l+=e*d/this.getFilmWidth()),this.projectionMatrix.makePerspective(l,l+a,t,t-r,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class Vm extends Py{constructor(e=-1,t=1,r=1,a=-1,l=.1,c=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=r,this.bottom=a,this.near=l,this.far=c,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,r,a,l,c){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=r,this.view.offsetY=a,this.view.width=l,this.view.height=c,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),r=(this.right+this.left)/2,a=(this.top+this.bottom)/2;let l=r-e,c=r+e,d=a+t,h=a-t;if(this.view!==null&&this.view.enabled){const f=(this.right-this.left)/this.view.fullWidth/this.zoom,g=(this.top-this.bottom)/this.view.fullHeight/this.zoom;l+=f*this.view.offsetX,c=l+f*this.view.width,d-=g*this.view.offsetY,h=d-g*this.view.height}this.projectionMatrix.makeOrthographic(l,c,d,h,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class cT extends lT{constructor(){super(new Vm(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class jf extends Hm{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(Mn.DEFAULT_UP),this.updateMatrix(),this.target=new Mn,this.shadow=new cT}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class uT extends Hm{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}const lo=-90,co=1;class dT extends Mn{constructor(e,t,r){super(),this.type="CubeCamera",this.renderTarget=r,this.coordinateSystem=null,this.activeMipmapLevel=0;const a=new Ii(lo,co,e,t);a.layers=this.layers,this.add(a);const l=new Ii(lo,co,e,t);l.layers=this.layers,this.add(l);const c=new Ii(lo,co,e,t);c.layers=this.layers,this.add(c);const d=new Ii(lo,co,e,t);d.layers=this.layers,this.add(d);const h=new Ii(lo,co,e,t);h.layers=this.layers,this.add(h);const f=new Ii(lo,co,e,t);f.layers=this.layers,this.add(f)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[r,a,l,c,d,h]=t;for(const f of t)this.remove(f);if(e===mr)r.up.set(0,1,0),r.lookAt(1,0,0),a.up.set(0,1,0),a.lookAt(-1,0,0),l.up.set(0,0,-1),l.lookAt(0,1,0),c.up.set(0,0,1),c.lookAt(0,-1,0),d.up.set(0,1,0),d.lookAt(0,0,1),h.up.set(0,1,0),h.lookAt(0,0,-1);else if(e===$l)r.up.set(0,-1,0),r.lookAt(-1,0,0),a.up.set(0,-1,0),a.lookAt(1,0,0),l.up.set(0,0,1),l.lookAt(0,1,0),c.up.set(0,0,-1),c.lookAt(0,-1,0),d.up.set(0,-1,0),d.lookAt(0,0,1),h.up.set(0,-1,0),h.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const f of t)this.add(f),f.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:r,activeMipmapLevel:a}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[l,c,d,h,f,g]=this.children,p=e.getRenderTarget(),v=e.getActiveCubeFace(),_=e.getActiveMipmapLevel(),E=e.xr.enabled;e.xr.enabled=!1;const b=r.texture.generateMipmaps;r.texture.generateMipmaps=!1;let M=!1;e.isWebGLRenderer===!0?M=e.state.buffers.depth.getReversed():M=e.reversedDepthBuffer,e.setRenderTarget(r,0,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(r,1,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(r,2,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,d),e.setRenderTarget(r,3,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(r,4,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,f),r.texture.generateMipmaps=b,e.setRenderTarget(r,5,a),M&&e.autoClear===!1&&e.clearDepth(),e.render(t,g),e.setRenderTarget(p,v,_),e.xr.enabled=E,r.texture.needsPMREMUpdate=!0}}class hT extends Ii{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class Tv{constructor(e=1,t=0,r=0){this.radius=e,this.phi=t,this.theta=r}set(e,t,r){return this.radius=e,this.phi=t,this.theta=r,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Mt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,r){return this.radius=Math.sqrt(e*e+t*t+r*r),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,r),this.phi=Math.acos(Mt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const qm=class qm{constructor(e,t,r,a){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,r,a)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let r=0;r<4;r++)this.elements[r]=e[r+t];return this}set(e,t,r,a){const l=this.elements;return l[0]=e,l[2]=t,l[1]=r,l[3]=a,this}};qm.prototype.isMatrix2=!0;let Cv=qm;class fT extends zs{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){ot("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function Rv(i,e,t,r){const a=pT(r);switch(t){case xy:return i*e;case _y:return i*e/a.components*a.byteLength;case Im:return i*e/a.components*a.byteLength;case wa:return i*e*2/a.components*a.byteLength;case Um:return i*e*2/a.components*a.byteLength;case vy:return i*e*3/a.components*a.byteLength;case Ki:return i*e*4/a.components*a.byteLength;case Fm:return i*e*4/a.components*a.byteLength;case Xu:case $u:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case qu:case Ku:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Pp:case Lp:return Math.max(i,16)*Math.max(e,8)/4;case Ap:case Np:return Math.max(i,8)*Math.max(e,8)/2;case Dp:case Ip:case Fp:case Op:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Up:case rd:case kp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case zp:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Bp:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Hp:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Vp:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Gp:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case jp:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Wp:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Xp:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case $p:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case qp:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Kp:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Yp:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Qp:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Zp:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Jp:case em:case tm:return Math.ceil(i/4)*Math.ceil(e/4)*16;case nm:case im:return Math.ceil(i/4)*Math.ceil(e/4)*8;case sd:case rm:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function pT(i){switch(i){case Si:case fy:return{byteLength:1,components:1};case Wl:case py:case Kr:return{byteLength:2,components:1};case Lm:case Dm:return{byteLength:2,components:4};case yr:case Nm:case pr:return{byteLength:4,components:1};case my:case gy:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Rm}}));typeof window<"u"&&(window.__THREE__?ot("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Rm);/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function Ny(){let i=null,e=!1,t=null,r=null;function a(l,c){t(l,c),r=i.requestAnimationFrame(a)}return{start:function(){e!==!0&&t!==null&&i!==null&&(r=i.requestAnimationFrame(a),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(r),e=!1},setAnimationLoop:function(l){t=l},setContext:function(l){i=l}}}function mT(i){const e=new WeakMap;function t(d,h){const f=d.array,g=d.usage,p=f.byteLength,v=i.createBuffer();i.bindBuffer(h,v),i.bufferData(h,f,g),d.onUploadCallback();let _;if(f instanceof Float32Array)_=i.FLOAT;else if(typeof Float16Array<"u"&&f instanceof Float16Array)_=i.HALF_FLOAT;else if(f instanceof Uint16Array)d.isFloat16BufferAttribute?_=i.HALF_FLOAT:_=i.UNSIGNED_SHORT;else if(f instanceof Int16Array)_=i.SHORT;else if(f instanceof Uint32Array)_=i.UNSIGNED_INT;else if(f instanceof Int32Array)_=i.INT;else if(f instanceof Int8Array)_=i.BYTE;else if(f instanceof Uint8Array)_=i.UNSIGNED_BYTE;else if(f instanceof Uint8ClampedArray)_=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+f);return{buffer:v,type:_,bytesPerElement:f.BYTES_PER_ELEMENT,version:d.version,size:p}}function r(d,h,f){const g=h.array,p=h.updateRanges;if(i.bindBuffer(f,d),p.length===0)i.bufferSubData(f,0,g);else{p.sort((_,E)=>_.start-E.start);let v=0;for(let _=1;_<p.length;_++){const E=p[v],b=p[_];b.start<=E.start+E.count+1?E.count=Math.max(E.count,b.start+b.count-E.start):(++v,p[v]=b)}p.length=v+1;for(let _=0,E=p.length;_<E;_++){const b=p[_];i.bufferSubData(f,b.start*g.BYTES_PER_ELEMENT,g,b.start,b.count)}h.clearUpdateRanges()}h.onUploadCallback()}function a(d){return d.isInterleavedBufferAttribute&&(d=d.data),e.get(d)}function l(d){d.isInterleavedBufferAttribute&&(d=d.data);const h=e.get(d);h&&(i.deleteBuffer(h.buffer),e.delete(d))}function c(d,h){if(d.isInterleavedBufferAttribute&&(d=d.data),d.isGLBufferAttribute){const g=e.get(d);(!g||g.version<d.version)&&e.set(d,{buffer:d.buffer,type:d.type,bytesPerElement:d.elementSize,version:d.version});return}const f=e.get(d);if(f===void 0)e.set(d,t(d,h));else if(f.version<d.version){if(f.size!==d.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(f.buffer,d,h),f.version=d.version}}return{get:a,remove:l,update:c}}var gT=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,xT=`#ifdef USE_ALPHAHASH
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
#endif`,vT=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,_T=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,yT=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,ST=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,MT=`#ifdef USE_AOMAP
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
#endif`,ET=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,wT=`#ifdef USE_BATCHING
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
#endif`,bT=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,TT=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,CT=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,RT=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,AT=`#ifdef USE_IRIDESCENCE
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
#endif`,PT=`#ifdef USE_BUMPMAP
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
#endif`,NT=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,LT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,DT=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,IT=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,UT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,FT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,OT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,kT=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,zT=`#define PI 3.141592653589793
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
} // validated`,BT=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,HT=`vec3 transformedNormal = objectNormal;
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
#endif`,VT=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,GT=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,jT=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,WT=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,XT="gl_FragColor = linearToOutputTexel( gl_FragColor );",$T=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,qT=`#ifdef USE_ENVMAP
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
#endif`,KT=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,YT=`#ifdef USE_ENVMAP
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
#endif`,QT=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ZT=`#ifdef USE_ENVMAP
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
#endif`,JT=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,eC=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,tC=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,nC=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,iC=`#ifdef USE_GRADIENTMAP
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
}`,rC=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,sC=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,aC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,oC=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,lC=`#ifdef USE_ENVMAP
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
#endif`,cC=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,uC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,dC=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,hC=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,fC=`PhysicalMaterial material;
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
#endif`,pC=`uniform sampler2D dfgLUT;
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
}`,mC=`
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
#endif`,gC=`#if defined( RE_IndirectDiffuse )
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
#endif`,xC=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,vC=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,_C=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,yC=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,SC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,MC=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,EC=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,wC=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,bC=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,TC=`#if defined( USE_POINTS_UV )
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
#endif`,CC=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,RC=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,AC=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,PC=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,NC=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,LC=`#ifdef USE_MORPHTARGETS
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
#endif`,DC=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,IC=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,UC=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,FC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,OC=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,kC=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,zC=`#ifdef USE_NORMALMAP
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
#endif`,BC=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,HC=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,VC=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,GC=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,jC=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,WC=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,XC=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,$C=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,qC=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,KC=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,YC=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,QC=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,ZC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,JC=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,eR=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,tR=`float getShadowMask() {
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
}`,nR=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,iR=`#ifdef USE_SKINNING
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
#endif`,rR=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,sR=`#ifdef USE_SKINNING
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
#endif`,aR=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,oR=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,lR=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,cR=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,uR=`#ifdef USE_TRANSMISSION
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
#endif`,dR=`#ifdef USE_TRANSMISSION
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
#endif`,hR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,fR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,pR=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,mR=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const gR=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,xR=`uniform sampler2D t2D;
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
}`,vR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,_R=`#ifdef ENVMAP_TYPE_CUBE
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
}`,yR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,SR=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,MR=`#include <common>
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
}`,ER=`#if DEPTH_PACKING == 3200
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
}`,wR=`#define DISTANCE
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
}`,bR=`#define DISTANCE
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
}`,TR=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,CR=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,RR=`uniform float scale;
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
}`,AR=`uniform vec3 diffuse;
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
}`,PR=`#include <common>
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
}`,NR=`uniform vec3 diffuse;
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
}`,LR=`#define LAMBERT
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
}`,DR=`#define LAMBERT
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
}`,IR=`#define MATCAP
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
}`,UR=`#define MATCAP
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
}`,FR=`#define NORMAL
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
}`,OR=`#define NORMAL
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
}`,kR=`#define PHONG
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
}`,zR=`#define PHONG
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
}`,BR=`#define STANDARD
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
}`,HR=`#define STANDARD
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
}`,VR=`#define TOON
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
}`,GR=`#define TOON
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
}`,jR=`uniform float size;
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
}`,WR=`uniform vec3 diffuse;
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
}`,XR=`#include <common>
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
}`,$R=`uniform vec3 color;
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
}`,qR=`uniform float rotation;
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
}`,KR=`uniform vec3 diffuse;
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
}`,xt={alphahash_fragment:gT,alphahash_pars_fragment:xT,alphamap_fragment:vT,alphamap_pars_fragment:_T,alphatest_fragment:yT,alphatest_pars_fragment:ST,aomap_fragment:MT,aomap_pars_fragment:ET,batching_pars_vertex:wT,batching_vertex:bT,begin_vertex:TT,beginnormal_vertex:CT,bsdfs:RT,iridescence_fragment:AT,bumpmap_pars_fragment:PT,clipping_planes_fragment:NT,clipping_planes_pars_fragment:LT,clipping_planes_pars_vertex:DT,clipping_planes_vertex:IT,color_fragment:UT,color_pars_fragment:FT,color_pars_vertex:OT,color_vertex:kT,common:zT,cube_uv_reflection_fragment:BT,defaultnormal_vertex:HT,displacementmap_pars_vertex:VT,displacementmap_vertex:GT,emissivemap_fragment:jT,emissivemap_pars_fragment:WT,colorspace_fragment:XT,colorspace_pars_fragment:$T,envmap_fragment:qT,envmap_common_pars_fragment:KT,envmap_pars_fragment:YT,envmap_pars_vertex:QT,envmap_physical_pars_fragment:lC,envmap_vertex:ZT,fog_vertex:JT,fog_pars_vertex:eC,fog_fragment:tC,fog_pars_fragment:nC,gradientmap_pars_fragment:iC,lightmap_pars_fragment:rC,lights_lambert_fragment:sC,lights_lambert_pars_fragment:aC,lights_pars_begin:oC,lights_toon_fragment:cC,lights_toon_pars_fragment:uC,lights_phong_fragment:dC,lights_phong_pars_fragment:hC,lights_physical_fragment:fC,lights_physical_pars_fragment:pC,lights_fragment_begin:mC,lights_fragment_maps:gC,lights_fragment_end:xC,lightprobes_pars_fragment:vC,logdepthbuf_fragment:_C,logdepthbuf_pars_fragment:yC,logdepthbuf_pars_vertex:SC,logdepthbuf_vertex:MC,map_fragment:EC,map_pars_fragment:wC,map_particle_fragment:bC,map_particle_pars_fragment:TC,metalnessmap_fragment:CC,metalnessmap_pars_fragment:RC,morphinstance_vertex:AC,morphcolor_vertex:PC,morphnormal_vertex:NC,morphtarget_pars_vertex:LC,morphtarget_vertex:DC,normal_fragment_begin:IC,normal_fragment_maps:UC,normal_pars_fragment:FC,normal_pars_vertex:OC,normal_vertex:kC,normalmap_pars_fragment:zC,clearcoat_normal_fragment_begin:BC,clearcoat_normal_fragment_maps:HC,clearcoat_pars_fragment:VC,iridescence_pars_fragment:GC,opaque_fragment:jC,packing:WC,premultiplied_alpha_fragment:XC,project_vertex:$C,dithering_fragment:qC,dithering_pars_fragment:KC,roughnessmap_fragment:YC,roughnessmap_pars_fragment:QC,shadowmap_pars_fragment:ZC,shadowmap_pars_vertex:JC,shadowmap_vertex:eR,shadowmask_pars_fragment:tR,skinbase_vertex:nR,skinning_pars_vertex:iR,skinning_vertex:rR,skinnormal_vertex:sR,specularmap_fragment:aR,specularmap_pars_fragment:oR,tonemapping_fragment:lR,tonemapping_pars_fragment:cR,transmission_fragment:uR,transmission_pars_fragment:dR,uv_pars_fragment:hR,uv_pars_vertex:fR,uv_vertex:pR,worldpos_vertex:mR,background_vert:gR,background_frag:xR,backgroundCube_vert:vR,backgroundCube_frag:_R,cube_vert:yR,cube_frag:SR,depth_vert:MR,depth_frag:ER,distance_vert:wR,distance_frag:bR,equirect_vert:TR,equirect_frag:CR,linedashed_vert:RR,linedashed_frag:AR,meshbasic_vert:PR,meshbasic_frag:NR,meshlambert_vert:LR,meshlambert_frag:DR,meshmatcap_vert:IR,meshmatcap_frag:UR,meshnormal_vert:FR,meshnormal_frag:OR,meshphong_vert:kR,meshphong_frag:zR,meshphysical_vert:BR,meshphysical_frag:HR,meshtoon_vert:VR,meshtoon_frag:GR,points_vert:jR,points_frag:WR,shadow_vert:XR,shadow_frag:$R,sprite_vert:qR,sprite_frag:KR},ke={common:{diffuse:{value:new gt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new pt}},envmap:{envMap:{value:null},envMapRotation:{value:new pt},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new pt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new pt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new pt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new pt},normalScale:{value:new ut(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new pt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new pt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new pt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new pt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new gt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new te},probesMax:{value:new te},probesResolution:{value:new te}},points:{diffuse:{value:new gt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0},uvTransform:{value:new pt}},sprite:{diffuse:{value:new gt(16777215)},opacity:{value:1},center:{value:new ut(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new pt},alphaMap:{value:null},alphaMapTransform:{value:new pt},alphaTest:{value:0}}},ur={basic:{uniforms:Yn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.fog]),vertexShader:xt.meshbasic_vert,fragmentShader:xt.meshbasic_frag},lambert:{uniforms:Yn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new gt(0)},envMapIntensity:{value:1}}]),vertexShader:xt.meshlambert_vert,fragmentShader:xt.meshlambert_frag},phong:{uniforms:Yn([ke.common,ke.specularmap,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,ke.lights,{emissive:{value:new gt(0)},specular:{value:new gt(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:xt.meshphong_vert,fragmentShader:xt.meshphong_frag},standard:{uniforms:Yn([ke.common,ke.envmap,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.roughnessmap,ke.metalnessmap,ke.fog,ke.lights,{emissive:{value:new gt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:xt.meshphysical_vert,fragmentShader:xt.meshphysical_frag},toon:{uniforms:Yn([ke.common,ke.aomap,ke.lightmap,ke.emissivemap,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.gradientmap,ke.fog,ke.lights,{emissive:{value:new gt(0)}}]),vertexShader:xt.meshtoon_vert,fragmentShader:xt.meshtoon_frag},matcap:{uniforms:Yn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,ke.fog,{matcap:{value:null}}]),vertexShader:xt.meshmatcap_vert,fragmentShader:xt.meshmatcap_frag},points:{uniforms:Yn([ke.points,ke.fog]),vertexShader:xt.points_vert,fragmentShader:xt.points_frag},dashed:{uniforms:Yn([ke.common,ke.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:xt.linedashed_vert,fragmentShader:xt.linedashed_frag},depth:{uniforms:Yn([ke.common,ke.displacementmap]),vertexShader:xt.depth_vert,fragmentShader:xt.depth_frag},normal:{uniforms:Yn([ke.common,ke.bumpmap,ke.normalmap,ke.displacementmap,{opacity:{value:1}}]),vertexShader:xt.meshnormal_vert,fragmentShader:xt.meshnormal_frag},sprite:{uniforms:Yn([ke.sprite,ke.fog]),vertexShader:xt.sprite_vert,fragmentShader:xt.sprite_frag},background:{uniforms:{uvTransform:{value:new pt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:xt.background_vert,fragmentShader:xt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new pt}},vertexShader:xt.backgroundCube_vert,fragmentShader:xt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:xt.cube_vert,fragmentShader:xt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:xt.equirect_vert,fragmentShader:xt.equirect_frag},distance:{uniforms:Yn([ke.common,ke.displacementmap,{referencePosition:{value:new te},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:xt.distance_vert,fragmentShader:xt.distance_frag},shadow:{uniforms:Yn([ke.lights,ke.fog,{color:{value:new gt(0)},opacity:{value:1}}]),vertexShader:xt.shadow_vert,fragmentShader:xt.shadow_frag}};ur.physical={uniforms:Yn([ur.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new pt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new pt},clearcoatNormalScale:{value:new ut(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new pt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new pt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new pt},sheen:{value:0},sheenColor:{value:new gt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new pt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new pt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new pt},transmissionSamplerSize:{value:new ut},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new pt},attenuationDistance:{value:0},attenuationColor:{value:new gt(0)},specularColor:{value:new gt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new pt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new pt},anisotropyVector:{value:new ut},anisotropyMap:{value:null},anisotropyMapTransform:{value:new pt}}]),vertexShader:xt.meshphysical_vert,fragmentShader:xt.meshphysical_frag};const ku={r:0,b:0,g:0},YR=new rn,Ly=new pt;Ly.set(-1,0,0,0,1,0,0,0,1);function QR(i,e,t,r,a,l){const c=new gt(0);let d=a===!0?0:1,h,f,g=null,p=0,v=null;function _(P){let L=P.isScene===!0?P.background:null;if(L&&L.isTexture){const C=P.backgroundBlurriness>0;L=e.get(L,C)}return L}function E(P){let L=!1;const C=_(P);C===null?M(c,d):C&&C.isColor&&(M(C,1),L=!0);const I=i.xr.getEnvironmentBlendMode();I==="additive"?t.buffers.color.setClear(0,0,0,1,l):I==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,l),(i.autoClear||L)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function b(P,L){const C=_(L);C&&(C.isCubeTexture||C.mapping===_d)?(f===void 0&&(f=new Qi(new rc(1,1,1),new Mr({name:"BackgroundCubeMaterial",uniforms:Fo(ur.backgroundCube.uniforms),vertexShader:ur.backgroundCube.vertexShader,fragmentShader:ur.backgroundCube.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),f.geometry.deleteAttribute("normal"),f.geometry.deleteAttribute("uv"),f.onBeforeRender=function(I,N,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(f.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(f)),f.material.uniforms.envMap.value=C,f.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,f.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,f.material.uniforms.backgroundRotation.value.setFromMatrix4(YR.makeRotationFromEuler(L.backgroundRotation)).transpose(),C.isCubeTexture&&C.isRenderTargetTexture===!1&&f.material.uniforms.backgroundRotation.value.premultiply(Ly),f.material.toneMapped=Tt.getTransfer(C.colorSpace)!==Bt,(g!==C||p!==C.version||v!==i.toneMapping)&&(f.material.needsUpdate=!0,g=C,p=C.version,v=i.toneMapping),f.layers.enableAll(),P.unshift(f,f.geometry,f.material,0,0,null)):C&&C.isTexture&&(h===void 0&&(h=new Qi(new Sd(2,2),new Mr({name:"BackgroundMaterial",uniforms:Fo(ur.background.uniforms),vertexShader:ur.background.vertexShader,fragmentShader:ur.background.fragmentShader,side:Os,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),h.geometry.deleteAttribute("normal"),Object.defineProperty(h.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(h)),h.material.uniforms.t2D.value=C,h.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,h.material.toneMapped=Tt.getTransfer(C.colorSpace)!==Bt,C.matrixAutoUpdate===!0&&C.updateMatrix(),h.material.uniforms.uvTransform.value.copy(C.matrix),(g!==C||p!==C.version||v!==i.toneMapping)&&(h.material.needsUpdate=!0,g=C,p=C.version,v=i.toneMapping),h.layers.enableAll(),P.unshift(h,h.geometry,h.material,0,0,null))}function M(P,L){P.getRGB(ku,Ay(i)),t.buffers.color.setClear(ku.r,ku.g,ku.b,L,l)}function S(){f!==void 0&&(f.geometry.dispose(),f.material.dispose(),f=void 0),h!==void 0&&(h.geometry.dispose(),h.material.dispose(),h=void 0)}return{getClearColor:function(){return c},setClearColor:function(P,L=1){c.set(P),d=L,M(c,d)},getClearAlpha:function(){return d},setClearAlpha:function(P){d=P,M(c,d)},render:E,addToRenderList:b,dispose:S}}function ZR(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),r={},a=v(null);let l=a,c=!1;function d(H,X,j,le,$){let ue=!1;const J=p(H,le,j,X);l!==J&&(l=J,f(l.object)),ue=_(H,le,j,$),ue&&E(H,le,j,$),$!==null&&e.update($,i.ELEMENT_ARRAY_BUFFER),(ue||c)&&(c=!1,C(H,X,j,le),$!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get($).buffer))}function h(){return i.createVertexArray()}function f(H){return i.bindVertexArray(H)}function g(H){return i.deleteVertexArray(H)}function p(H,X,j,le){const $=le.wireframe===!0;let ue=r[X.id];ue===void 0&&(ue={},r[X.id]=ue);const J=H.isInstancedMesh===!0?H.id:0;let K=ue[J];K===void 0&&(K={},ue[J]=K);let re=K[j.id];re===void 0&&(re={},K[j.id]=re);let de=re[$];return de===void 0&&(de=v(h()),re[$]=de),de}function v(H){const X=[],j=[],le=[];for(let $=0;$<t;$++)X[$]=0,j[$]=0,le[$]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:X,enabledAttributes:j,attributeDivisors:le,object:H,attributes:{},index:null}}function _(H,X,j,le){const $=l.attributes,ue=X.attributes;let J=0;const K=j.getAttributes();for(const re in K)if(K[re].location>=0){const F=$[re];let ee=ue[re];if(ee===void 0&&(re==="instanceMatrix"&&H.instanceMatrix&&(ee=H.instanceMatrix),re==="instanceColor"&&H.instanceColor&&(ee=H.instanceColor)),F===void 0||F.attribute!==ee||ee&&F.data!==ee.data)return!0;J++}return l.attributesNum!==J||l.index!==le}function E(H,X,j,le){const $={},ue=X.attributes;let J=0;const K=j.getAttributes();for(const re in K)if(K[re].location>=0){let F=ue[re];F===void 0&&(re==="instanceMatrix"&&H.instanceMatrix&&(F=H.instanceMatrix),re==="instanceColor"&&H.instanceColor&&(F=H.instanceColor));const ee={};ee.attribute=F,F&&F.data&&(ee.data=F.data),$[re]=ee,J++}l.attributes=$,l.attributesNum=J,l.index=le}function b(){const H=l.newAttributes;for(let X=0,j=H.length;X<j;X++)H[X]=0}function M(H){S(H,0)}function S(H,X){const j=l.newAttributes,le=l.enabledAttributes,$=l.attributeDivisors;j[H]=1,le[H]===0&&(i.enableVertexAttribArray(H),le[H]=1),$[H]!==X&&(i.vertexAttribDivisor(H,X),$[H]=X)}function P(){const H=l.newAttributes,X=l.enabledAttributes;for(let j=0,le=X.length;j<le;j++)X[j]!==H[j]&&(i.disableVertexAttribArray(j),X[j]=0)}function L(H,X,j,le,$,ue,J){J===!0?i.vertexAttribIPointer(H,X,j,$,ue):i.vertexAttribPointer(H,X,j,le,$,ue)}function C(H,X,j,le){b();const $=le.attributes,ue=j.getAttributes(),J=X.defaultAttributeValues;for(const K in ue){const re=ue[K];if(re.location>=0){let de=$[K];if(de===void 0&&(K==="instanceMatrix"&&H.instanceMatrix&&(de=H.instanceMatrix),K==="instanceColor"&&H.instanceColor&&(de=H.instanceColor)),de!==void 0){const F=de.normalized,ee=de.itemSize,Ce=e.get(de);if(Ce===void 0)continue;const Ve=Ce.buffer,Ge=Ce.type,V=Ce.bytesPerElement,xe=Ge===i.INT||Ge===i.UNSIGNED_INT||de.gpuType===Nm;if(de.isInterleavedBufferAttribute){const fe=de.data,ne=fe.stride,Le=de.offset;if(fe.isInstancedInterleavedBuffer){for(let qe=0;qe<re.locationSize;qe++)S(re.location+qe,fe.meshPerAttribute);H.isInstancedMesh!==!0&&le._maxInstanceCount===void 0&&(le._maxInstanceCount=fe.meshPerAttribute*fe.count)}else for(let qe=0;qe<re.locationSize;qe++)M(re.location+qe);i.bindBuffer(i.ARRAY_BUFFER,Ve);for(let qe=0;qe<re.locationSize;qe++)L(re.location+qe,ee/re.locationSize,Ge,F,ne*V,(Le+ee/re.locationSize*qe)*V,xe)}else{if(de.isInstancedBufferAttribute){for(let fe=0;fe<re.locationSize;fe++)S(re.location+fe,de.meshPerAttribute);H.isInstancedMesh!==!0&&le._maxInstanceCount===void 0&&(le._maxInstanceCount=de.meshPerAttribute*de.count)}else for(let fe=0;fe<re.locationSize;fe++)M(re.location+fe);i.bindBuffer(i.ARRAY_BUFFER,Ve);for(let fe=0;fe<re.locationSize;fe++)L(re.location+fe,ee/re.locationSize,Ge,F,ee*V,ee/re.locationSize*fe*V,xe)}}else if(J!==void 0){const F=J[K];if(F!==void 0)switch(F.length){case 2:i.vertexAttrib2fv(re.location,F);break;case 3:i.vertexAttrib3fv(re.location,F);break;case 4:i.vertexAttrib4fv(re.location,F);break;default:i.vertexAttrib1fv(re.location,F)}}}}P()}function I(){D();for(const H in r){const X=r[H];for(const j in X){const le=X[j];for(const $ in le){const ue=le[$];for(const J in ue)g(ue[J].object),delete ue[J];delete le[$]}}delete r[H]}}function N(H){if(r[H.id]===void 0)return;const X=r[H.id];for(const j in X){const le=X[j];for(const $ in le){const ue=le[$];for(const J in ue)g(ue[J].object),delete ue[J];delete le[$]}}delete r[H.id]}function U(H){for(const X in r){const j=r[X];for(const le in j){const $=j[le];if($[H.id]===void 0)continue;const ue=$[H.id];for(const J in ue)g(ue[J].object),delete ue[J];delete $[H.id]}}}function w(H){for(const X in r){const j=r[X],le=H.isInstancedMesh===!0?H.id:0,$=j[le];if($!==void 0){for(const ue in $){const J=$[ue];for(const K in J)g(J[K].object),delete J[K];delete $[ue]}delete j[le],Object.keys(j).length===0&&delete r[X]}}}function D(){z(),c=!0,l!==a&&(l=a,f(l.object))}function z(){a.geometry=null,a.program=null,a.wireframe=!1}return{setup:d,reset:D,resetDefaultState:z,dispose:I,releaseStatesOfGeometry:N,releaseStatesOfObject:w,releaseStatesOfProgram:U,initAttributes:b,enableAttribute:M,disableUnusedAttributes:P}}function JR(i,e,t){let r;function a(h){r=h}function l(h,f){i.drawArrays(r,h,f),t.update(f,r,1)}function c(h,f,g){g!==0&&(i.drawArraysInstanced(r,h,f,g),t.update(f,r,g))}function d(h,f,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(r,h,0,f,0,g);let v=0;for(let _=0;_<g;_++)v+=f[_];t.update(v,r,1)}this.setMode=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=d}function eA(i,e,t,r){let a;function l(){if(a!==void 0)return a;if(e.has("EXT_texture_filter_anisotropic")===!0){const U=e.get("EXT_texture_filter_anisotropic");a=i.getParameter(U.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else a=0;return a}function c(U){return!(U!==Ki&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function d(U){const w=U===Kr&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(U!==Si&&r.convert(U)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&U!==pr&&!w)}function h(U){if(U==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";U="mediump"}return U==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let f=t.precision!==void 0?t.precision:"highp";const g=h(f);g!==f&&(ot("WebGLRenderer:",f,"not supported, using",g,"instead."),f=g);const p=t.logarithmicDepthBuffer===!0,v=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&v===!1&&ot("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");const _=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),E=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),b=i.getParameter(i.MAX_TEXTURE_SIZE),M=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),S=i.getParameter(i.MAX_VERTEX_ATTRIBS),P=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),L=i.getParameter(i.MAX_VARYING_VECTORS),C=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),I=i.getParameter(i.MAX_SAMPLES),N=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:l,getMaxPrecision:h,textureFormatReadable:c,textureTypeReadable:d,precision:f,logarithmicDepthBuffer:p,reversedDepthBuffer:v,maxTextures:_,maxVertexTextures:E,maxTextureSize:b,maxCubemapSize:M,maxAttributes:S,maxVertexUniforms:P,maxVaryings:L,maxFragmentUniforms:C,maxSamples:I,samples:N}}function tA(i){const e=this;let t=null,r=0,a=!1,l=!1;const c=new ws,d=new pt,h={value:null,needsUpdate:!1};this.uniform=h,this.numPlanes=0,this.numIntersection=0,this.init=function(p,v){const _=p.length!==0||v||r!==0||a;return a=v,r=p.length,_},this.beginShadows=function(){l=!0,g(null)},this.endShadows=function(){l=!1},this.setGlobalState=function(p,v){t=g(p,v,0)},this.setState=function(p,v,_){const E=p.clippingPlanes,b=p.clipIntersection,M=p.clipShadows,S=i.get(p);if(!a||E===null||E.length===0||l&&!M)l?g(null):f();else{const P=l?0:r,L=P*4;let C=S.clippingState||null;h.value=C,C=g(E,v,L,_);for(let I=0;I!==L;++I)C[I]=t[I];S.clippingState=C,this.numIntersection=b?this.numPlanes:0,this.numPlanes+=P}};function f(){h.value!==t&&(h.value=t,h.needsUpdate=r>0),e.numPlanes=r,e.numIntersection=0}function g(p,v,_,E){const b=p!==null?p.length:0;let M=null;if(b!==0){if(M=h.value,E!==!0||M===null){const S=_+b*4,P=v.matrixWorldInverse;d.getNormalMatrix(P),(M===null||M.length<S)&&(M=new Float32Array(S));for(let L=0,C=_;L!==b;++L,C+=4)c.copy(p[L]).applyMatrix4(P,d),c.normal.toArray(M,C),M[C+3]=c.constant}h.value=M,h.needsUpdate=!0}return e.numPlanes=b,e.numIntersection=0,M}}const Us=4,Av=[.125,.215,.35,.446,.526,.582],ca=20,nA=256,Dl=new Vm,Pv=new gt;let Wf=null,Xf=0,$f=0,qf=!1;const iA=new te;class Nv{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,r=.1,a=100,l={}){const{size:c=256,position:d=iA}=l;Wf=this._renderer.getRenderTarget(),Xf=this._renderer.getActiveCubeFace(),$f=this._renderer.getActiveMipmapLevel(),qf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(c);const h=this._allocateTargets();return h.depthBuffer=!0,this._sceneToCubeUV(e,r,a,h,d),t>0&&this._blur(h,0,0,t),this._applyPMREM(h),this._cleanup(h),h}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Iv(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Dv(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Wf,Xf,$f),this._renderer.xr.enabled=qf,e.scissorTest=!1,uo(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ea||e.mapping===Io?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Wf=this._renderer.getRenderTarget(),Xf=this._renderer.getActiveCubeFace(),$f=this._renderer.getActiveMipmapLevel(),qf=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const r=t||this._allocateTargets();return this._textureToCubeUV(e,r),this._applyPMREM(r),this._cleanup(r),r}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,r={magFilter:jn,minFilter:jn,generateMipmaps:!1,type:Kr,format:Ki,colorSpace:od,depthBuffer:!1},a=Lv(e,t,r);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Lv(e,t,r);const{_lodMax:l}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=rA(l)),this._blurMaterial=aA(l,e,t),this._ggxMaterial=sA(l,e,t)}return a}_compileMaterial(e){const t=new Qi(new Mi,e);this._renderer.compile(t,Dl)}_sceneToCubeUV(e,t,r,a,l){const h=new Ii(90,1,t,r),f=[1,-1,1,1,1,1],g=[1,1,1,-1,-1,-1],p=this._renderer,v=p.autoClear,_=p.toneMapping;p.getClearColor(Pv),p.toneMapping=xr,p.autoClear=!1,p.state.buffers.depth.getReversed()&&(p.setRenderTarget(a),p.clearDepth(),p.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Qi(new rc,new Ty({name:"PMREM.Background",side:hi,depthWrite:!1,depthTest:!1})));const b=this._backgroundBox,M=b.material;let S=!1;const P=e.background;P?P.isColor&&(M.color.copy(P),e.background=null,S=!0):(M.color.copy(Pv),S=!0);for(let L=0;L<6;L++){const C=L%3;C===0?(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x+g[L],l.y,l.z)):C===1?(h.up.set(0,0,f[L]),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y+g[L],l.z)):(h.up.set(0,f[L],0),h.position.set(l.x,l.y,l.z),h.lookAt(l.x,l.y,l.z+g[L]));const I=this._cubeSize;uo(a,C*I,L>2?I:0,I,I),p.setRenderTarget(a),S&&p.render(b,h),p.render(e,h)}p.toneMapping=_,p.autoClear=v,e.background=P}_textureToCubeUV(e,t){const r=this._renderer,a=e.mapping===Ea||e.mapping===Io;a?(this._cubemapMaterial===null&&(this._cubemapMaterial=Iv()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Dv());const l=a?this._cubemapMaterial:this._equirectMaterial,c=this._lodMeshes[0];c.material=l;const d=l.uniforms;d.envMap.value=e;const h=this._cubeSize;uo(t,0,0,3*h,2*h),r.setRenderTarget(t),r.render(c,Dl)}_applyPMREM(e){const t=this._renderer,r=t.autoClear;t.autoClear=!1;const a=this._lodMeshes.length;for(let l=1;l<a;l++)this._applyGGXFilter(e,l-1,l);t.autoClear=r}_applyGGXFilter(e,t,r){const a=this._renderer,l=this._pingPongRenderTarget,c=this._ggxMaterial,d=this._lodMeshes[r];d.material=c;const h=c.uniforms,f=r/(this._lodMeshes.length-1),g=t/(this._lodMeshes.length-1),p=Math.sqrt(f*f-g*g),v=0+f*1.25,_=p*v,{_lodMax:E}=this,b=this._sizeLods[r],M=3*b*(r>E-Us?r-E+Us:0),S=4*(this._cubeSize-b);h.envMap.value=e.texture,h.roughness.value=_,h.mipInt.value=E-t,uo(l,M,S,3*b,2*b),a.setRenderTarget(l),a.render(d,Dl),h.envMap.value=l.texture,h.roughness.value=0,h.mipInt.value=E-r,uo(e,M,S,3*b,2*b),a.setRenderTarget(e),a.render(d,Dl)}_blur(e,t,r,a,l){const c=this._pingPongRenderTarget;this._halfBlur(e,c,t,r,a,"latitudinal",l),this._halfBlur(c,e,r,r,a,"longitudinal",l)}_halfBlur(e,t,r,a,l,c,d){const h=this._renderer,f=this._blurMaterial;c!=="latitudinal"&&c!=="longitudinal"&&Pt("blur direction must be either latitudinal or longitudinal!");const g=3,p=this._lodMeshes[a];p.material=f;const v=f.uniforms,_=this._sizeLods[r]-1,E=isFinite(l)?Math.PI/(2*_):2*Math.PI/(2*ca-1),b=l/E,M=isFinite(l)?1+Math.floor(g*b):ca;M>ca&&ot(`sigmaRadians, ${l}, is too large and will clip, as it requested ${M} samples when the maximum is set to ${ca}`);const S=[];let P=0;for(let U=0;U<ca;++U){const w=U/b,D=Math.exp(-w*w/2);S.push(D),U===0?P+=D:U<M&&(P+=2*D)}for(let U=0;U<S.length;U++)S[U]=S[U]/P;v.envMap.value=e.texture,v.samples.value=M,v.weights.value=S,v.latitudinal.value=c==="latitudinal",d&&(v.poleAxis.value=d);const{_lodMax:L}=this;v.dTheta.value=E,v.mipInt.value=L-r;const C=this._sizeLods[a],I=3*C*(a>L-Us?a-L+Us:0),N=4*(this._cubeSize-C);uo(t,I,N,3*C,2*C),h.setRenderTarget(t),h.render(p,Dl)}}function rA(i){const e=[],t=[],r=[];let a=i;const l=i-Us+1+Av.length;for(let c=0;c<l;c++){const d=Math.pow(2,a);e.push(d);let h=1/d;c>i-Us?h=Av[c-i+Us-1]:c===0&&(h=0),t.push(h);const f=1/(d-2),g=-f,p=1+f,v=[g,g,p,g,p,p,g,g,p,p,g,p],_=6,E=6,b=3,M=2,S=1,P=new Float32Array(b*E*_),L=new Float32Array(M*E*_),C=new Float32Array(S*E*_);for(let N=0;N<_;N++){const U=N%3*2/3-1,w=N>2?0:-1,D=[U,w,0,U+2/3,w,0,U+2/3,w+1,0,U,w,0,U+2/3,w+1,0,U,w+1,0];P.set(D,b*E*N),L.set(v,M*E*N);const z=[N,N,N,N,N,N];C.set(z,S*E*N)}const I=new Mi;I.setAttribute("position",new _r(P,b)),I.setAttribute("uv",new _r(L,M)),I.setAttribute("faceIndex",new _r(C,S)),r.push(new Qi(I,null)),a>Us&&a--}return{lodMeshes:r,sizeLods:e,sigmas:t}}function Lv(i,e,t){const r=new vr(i,e,t);return r.texture.mapping=_d,r.texture.name="PMREM.cubeUv",r.scissorTest=!0,r}function uo(i,e,t,r,a){i.viewport.set(e,t,r,a),i.scissor.set(e,t,r,a)}function sA(i,e,t){return new Mr({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:nA,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Md(),fragmentShader:`

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
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function aA(i,e,t){const r=new Float32Array(ca),a=new te(0,1,0);return new Mr({name:"SphericalGaussianBlur",defines:{n:ca,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:a}},vertexShader:Md(),fragmentShader:`

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
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function Dv(){return new Mr({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Md(),fragmentShader:`

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
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function Iv(){return new Mr({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Md(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Wr,depthTest:!1,depthWrite:!1})}function Md(){return`

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
	`}class Dy extends vr{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const r={width:e,height:e,depth:1},a=[r,r,r,r,r,r];this.texture=new Cy(a),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const r={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},a=new rc(5,5,5),l=new Mr({name:"CubemapFromEquirect",uniforms:Fo(r.uniforms),vertexShader:r.vertexShader,fragmentShader:r.fragmentShader,side:hi,blending:Wr});l.uniforms.tEquirect.value=t;const c=new Qi(a,l),d=t.minFilter;return t.minFilter===da&&(t.minFilter=jn),new dT(1,10,this).update(e,c),t.minFilter=d,c.geometry.dispose(),c.material.dispose(),this}clear(e,t=!0,r=!0,a=!0){const l=e.getRenderTarget();for(let c=0;c<6;c++)e.setRenderTarget(this,c),e.clear(t,r,a);e.setRenderTarget(l)}}function oA(i){let e=new WeakMap,t=new WeakMap,r=null;function a(v,_=!1){return v==null?null:_?c(v):l(v)}function l(v){if(v&&v.isTexture){const _=v.mapping;if(_===pf||_===mf)if(e.has(v)){const E=e.get(v).texture;return d(E,v.mapping)}else{const E=v.image;if(E&&E.height>0){const b=new Dy(E.height);return b.fromEquirectangularTexture(i,v),e.set(v,b),v.addEventListener("dispose",f),d(b.texture,v.mapping)}else return null}}return v}function c(v){if(v&&v.isTexture){const _=v.mapping,E=_===pf||_===mf,b=_===Ea||_===Io;if(E||b){let M=t.get(v);const S=M!==void 0?M.texture.pmremVersion:0;if(v.isRenderTargetTexture&&v.pmremVersion!==S)return r===null&&(r=new Nv(i)),M=E?r.fromEquirectangular(v,M):r.fromCubemap(v,M),M.texture.pmremVersion=v.pmremVersion,t.set(v,M),M.texture;if(M!==void 0)return M.texture;{const P=v.image;return E&&P&&P.height>0||b&&P&&h(P)?(r===null&&(r=new Nv(i)),M=E?r.fromEquirectangular(v):r.fromCubemap(v),M.texture.pmremVersion=v.pmremVersion,t.set(v,M),v.addEventListener("dispose",g),M.texture):null}}}return v}function d(v,_){return _===pf?v.mapping=Ea:_===mf&&(v.mapping=Io),v}function h(v){let _=0;const E=6;for(let b=0;b<E;b++)v[b]!==void 0&&_++;return _===E}function f(v){const _=v.target;_.removeEventListener("dispose",f);const E=e.get(_);E!==void 0&&(e.delete(_),E.dispose())}function g(v){const _=v.target;_.removeEventListener("dispose",g);const E=t.get(_);E!==void 0&&(t.delete(_),E.dispose())}function p(){e=new WeakMap,t=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:a,dispose:p}}function lA(i){const e={};function t(r){if(e[r]!==void 0)return e[r];const a=i.getExtension(r);return e[r]=a,a}return{has:function(r){return t(r)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(r){const a=t(r);return a===null&&xo("WebGLRenderer: "+r+" extension not supported."),a}}}function cA(i,e,t,r){const a={},l=new WeakMap;function c(p){const v=p.target;v.index!==null&&e.remove(v.index);for(const E in v.attributes)e.remove(v.attributes[E]);v.removeEventListener("dispose",c),delete a[v.id];const _=l.get(v);_&&(e.remove(_),l.delete(v)),r.releaseStatesOfGeometry(v),v.isInstancedBufferGeometry===!0&&delete v._maxInstanceCount,t.memory.geometries--}function d(p,v){return a[v.id]===!0||(v.addEventListener("dispose",c),a[v.id]=!0,t.memory.geometries++),v}function h(p){const v=p.attributes;for(const _ in v)e.update(v[_],i.ARRAY_BUFFER)}function f(p){const v=[],_=p.index,E=p.attributes.position;let b=0;if(E===void 0)return;if(_!==null){const P=_.array;b=_.version;for(let L=0,C=P.length;L<C;L+=3){const I=P[L+0],N=P[L+1],U=P[L+2];v.push(I,N,N,U,U,I)}}else{const P=E.array;b=E.version;for(let L=0,C=P.length/3-1;L<C;L+=3){const I=L+0,N=L+1,U=L+2;v.push(I,N,N,U,U,I)}}const M=new(E.count>=65535?by:wy)(v,1);M.version=b;const S=l.get(p);S&&e.remove(S),l.set(p,M)}function g(p){const v=l.get(p);if(v){const _=p.index;_!==null&&v.version<_.version&&f(p)}else f(p);return l.get(p)}return{get:d,update:h,getWireframeAttribute:g}}function uA(i,e,t){let r;function a(p){r=p}let l,c;function d(p){l=p.type,c=p.bytesPerElement}function h(p,v){i.drawElements(r,v,l,p*c),t.update(v,r,1)}function f(p,v,_){_!==0&&(i.drawElementsInstanced(r,v,l,p*c,_),t.update(v,r,_))}function g(p,v,_){if(_===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(r,v,0,l,p,0,_);let b=0;for(let M=0;M<_;M++)b+=v[M];t.update(b,r,1)}this.setMode=a,this.setIndex=d,this.render=h,this.renderInstances=f,this.renderMultiDraw=g}function dA(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function r(l,c,d){switch(t.calls++,c){case i.TRIANGLES:t.triangles+=d*(l/3);break;case i.LINES:t.lines+=d*(l/2);break;case i.LINE_STRIP:t.lines+=d*(l-1);break;case i.LINE_LOOP:t.lines+=d*l;break;case i.POINTS:t.points+=d*l;break;default:Pt("WebGLInfo: Unknown draw mode:",c);break}}function a(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:a,update:r}}function hA(i,e,t){const r=new WeakMap,a=new cn;function l(c,d,h){const f=c.morphTargetInfluences,g=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,p=g!==void 0?g.length:0;let v=r.get(d);if(v===void 0||v.count!==p){let z=function(){w.dispose(),r.delete(d),d.removeEventListener("dispose",z)};var _=z;v!==void 0&&v.texture.dispose();const E=d.morphAttributes.position!==void 0,b=d.morphAttributes.normal!==void 0,M=d.morphAttributes.color!==void 0,S=d.morphAttributes.position||[],P=d.morphAttributes.normal||[],L=d.morphAttributes.color||[];let C=0;E===!0&&(C=1),b===!0&&(C=2),M===!0&&(C=3);let I=d.attributes.position.count*C,N=1;I>e.maxTextureSize&&(N=Math.ceil(I/e.maxTextureSize),I=e.maxTextureSize);const U=new Float32Array(I*N*4*p),w=new Sy(U,I,N,p);w.type=pr,w.needsUpdate=!0;const D=C*4;for(let H=0;H<p;H++){const X=S[H],j=P[H],le=L[H],$=I*N*4*H;for(let ue=0;ue<X.count;ue++){const J=ue*D;E===!0&&(a.fromBufferAttribute(X,ue),U[$+J+0]=a.x,U[$+J+1]=a.y,U[$+J+2]=a.z,U[$+J+3]=0),b===!0&&(a.fromBufferAttribute(j,ue),U[$+J+4]=a.x,U[$+J+5]=a.y,U[$+J+6]=a.z,U[$+J+7]=0),M===!0&&(a.fromBufferAttribute(le,ue),U[$+J+8]=a.x,U[$+J+9]=a.y,U[$+J+10]=a.z,U[$+J+11]=le.itemSize===4?a.w:1)}}v={count:p,texture:w,size:new ut(I,N)},r.set(d,v),d.addEventListener("dispose",z)}if(c.isInstancedMesh===!0&&c.morphTexture!==null)h.getUniforms().setValue(i,"morphTexture",c.morphTexture,t);else{let E=0;for(let M=0;M<f.length;M++)E+=f[M];const b=d.morphTargetsRelative?1:1-E;h.getUniforms().setValue(i,"morphTargetBaseInfluence",b),h.getUniforms().setValue(i,"morphTargetInfluences",f)}h.getUniforms().setValue(i,"morphTargetsTexture",v.texture,t),h.getUniforms().setValue(i,"morphTargetsTextureSize",v.size)}return{update:l}}function fA(i,e,t,r,a){let l=new WeakMap;function c(f){const g=a.render.frame,p=f.geometry,v=e.get(f,p);if(l.get(v)!==g&&(e.update(v),l.set(v,g)),f.isInstancedMesh&&(f.hasEventListener("dispose",h)===!1&&f.addEventListener("dispose",h),l.get(f)!==g&&(t.update(f.instanceMatrix,i.ARRAY_BUFFER),f.instanceColor!==null&&t.update(f.instanceColor,i.ARRAY_BUFFER),l.set(f,g))),f.isSkinnedMesh){const _=f.skeleton;l.get(_)!==g&&(_.update(),l.set(_,g))}return v}function d(){l=new WeakMap}function h(f){const g=f.target;g.removeEventListener("dispose",h),r.releaseStatesOfObject(g),t.remove(g.instanceMatrix),g.instanceColor!==null&&t.remove(g.instanceColor)}return{update:c,dispose:d}}const pA={[ay]:"LINEAR_TONE_MAPPING",[oy]:"REINHARD_TONE_MAPPING",[ly]:"CINEON_TONE_MAPPING",[Pm]:"ACES_FILMIC_TONE_MAPPING",[uy]:"AGX_TONE_MAPPING",[dy]:"NEUTRAL_TONE_MAPPING",[cy]:"CUSTOM_TONE_MAPPING"};function mA(i,e,t,r,a,l){const c=new vr(e,t,{type:i,depthBuffer:a,stencilBuffer:l,samples:r?4:0,depthTexture:a?new Uo(e,t):void 0}),d=new vr(e,t,{type:Kr,depthBuffer:!1,stencilBuffer:!1}),h=new Mi;h.setAttribute("position",new In([-1,3,0,-1,-1,0,3,-1,0],3)),h.setAttribute("uv",new In([0,2,0,0,2,0],2));const f=new Qb({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),g=new Qi(h,f),p=new Vm(-1,1,1,-1,0,1);let v=null,_=null,E=!1,b,M=null,S=[],P=!1;this.setSize=function(L,C){c.setSize(L,C),d.setSize(L,C);for(let I=0;I<S.length;I++){const N=S[I];N.setSize&&N.setSize(L,C)}},this.setEffects=function(L){S=L,P=S.length>0&&S[0].isRenderPass===!0;const C=c.width,I=c.height;for(let N=0;N<S.length;N++){const U=S[N];U.setSize&&U.setSize(C,I)}},this.begin=function(L,C){if(E||L.toneMapping===xr&&S.length===0)return!1;if(M=C,C!==null){const I=C.width,N=C.height;(c.width!==I||c.height!==N)&&this.setSize(I,N)}return P===!1&&L.setRenderTarget(c),b=L.toneMapping,L.toneMapping=xr,!0},this.hasRenderPass=function(){return P},this.end=function(L,C){L.toneMapping=b,E=!0;let I=c,N=d;for(let U=0;U<S.length;U++){const w=S[U];if(w.enabled!==!1&&(w.render(L,N,I,C),w.needsSwap!==!1)){const D=I;I=N,N=D}}if(v!==L.outputColorSpace||_!==L.toneMapping){v=L.outputColorSpace,_=L.toneMapping,f.defines={},Tt.getTransfer(v)===Bt&&(f.defines.SRGB_TRANSFER="");const U=pA[_];U&&(f.defines[U]=""),f.needsUpdate=!0}f.uniforms.tDiffuse.value=I.texture,L.setRenderTarget(M),L.render(g,p),M=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){c.depthTexture&&c.depthTexture.dispose(),c.dispose(),d.dispose(),h.dispose(),f.dispose()}}const Iy=new Wn,om=new Uo(1,1),Uy=new Sy,Fy=new Cb,Oy=new Cy,Uv=[],Fv=[],Ov=new Float32Array(16),kv=new Float32Array(9),zv=new Float32Array(4);function Go(i,e,t){const r=i[0];if(r<=0||r>0)return i;const a=e*t;let l=Uv[a];if(l===void 0&&(l=new Float32Array(a),Uv[a]=l),e!==0){r.toArray(l,0);for(let c=1,d=0;c!==e;++c)d+=t,i[c].toArray(l,d)}return l}function En(i,e){if(i.length!==e.length)return!1;for(let t=0,r=i.length;t<r;t++)if(i[t]!==e[t])return!1;return!0}function wn(i,e){for(let t=0,r=e.length;t<r;t++)i[t]=e[t]}function Ed(i,e){let t=Fv[e];t===void 0&&(t=new Int32Array(e),Fv[e]=t);for(let r=0;r!==e;++r)t[r]=i.allocateTextureUnit();return t}function gA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function xA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(En(t,e))return;i.uniform2fv(this.addr,e),wn(t,e)}}function vA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(En(t,e))return;i.uniform3fv(this.addr,e),wn(t,e)}}function _A(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(En(t,e))return;i.uniform4fv(this.addr,e),wn(t,e)}}function yA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(En(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),wn(t,e)}else{if(En(t,r))return;zv.set(r),i.uniformMatrix2fv(this.addr,!1,zv),wn(t,r)}}function SA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(En(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),wn(t,e)}else{if(En(t,r))return;kv.set(r),i.uniformMatrix3fv(this.addr,!1,kv),wn(t,r)}}function MA(i,e){const t=this.cache,r=e.elements;if(r===void 0){if(En(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),wn(t,e)}else{if(En(t,r))return;Ov.set(r),i.uniformMatrix4fv(this.addr,!1,Ov),wn(t,r)}}function EA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function wA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(En(t,e))return;i.uniform2iv(this.addr,e),wn(t,e)}}function bA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(En(t,e))return;i.uniform3iv(this.addr,e),wn(t,e)}}function TA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(En(t,e))return;i.uniform4iv(this.addr,e),wn(t,e)}}function CA(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function RA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(En(t,e))return;i.uniform2uiv(this.addr,e),wn(t,e)}}function AA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(En(t,e))return;i.uniform3uiv(this.addr,e),wn(t,e)}}function PA(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(En(t,e))return;i.uniform4uiv(this.addr,e),wn(t,e)}}function NA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a);let l;this.type===i.SAMPLER_2D_SHADOW?(om.compareFunction=t.isReversedDepthBuffer()?km:Om,l=om):l=Iy,t.setTexture2D(e||l,a)}function LA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture3D(e||Fy,a)}function DA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTextureCube(e||Oy,a)}function IA(i,e,t){const r=this.cache,a=t.allocateTextureUnit();r[0]!==a&&(i.uniform1i(this.addr,a),r[0]=a),t.setTexture2DArray(e||Uy,a)}function UA(i){switch(i){case 5126:return gA;case 35664:return xA;case 35665:return vA;case 35666:return _A;case 35674:return yA;case 35675:return SA;case 35676:return MA;case 5124:case 35670:return EA;case 35667:case 35671:return wA;case 35668:case 35672:return bA;case 35669:case 35673:return TA;case 5125:return CA;case 36294:return RA;case 36295:return AA;case 36296:return PA;case 35678:case 36198:case 36298:case 36306:case 35682:return NA;case 35679:case 36299:case 36307:return LA;case 35680:case 36300:case 36308:case 36293:return DA;case 36289:case 36303:case 36311:case 36292:return IA}}function FA(i,e){i.uniform1fv(this.addr,e)}function OA(i,e){const t=Go(e,this.size,2);i.uniform2fv(this.addr,t)}function kA(i,e){const t=Go(e,this.size,3);i.uniform3fv(this.addr,t)}function zA(i,e){const t=Go(e,this.size,4);i.uniform4fv(this.addr,t)}function BA(i,e){const t=Go(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function HA(i,e){const t=Go(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function VA(i,e){const t=Go(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function GA(i,e){i.uniform1iv(this.addr,e)}function jA(i,e){i.uniform2iv(this.addr,e)}function WA(i,e){i.uniform3iv(this.addr,e)}function XA(i,e){i.uniform4iv(this.addr,e)}function $A(i,e){i.uniform1uiv(this.addr,e)}function qA(i,e){i.uniform2uiv(this.addr,e)}function KA(i,e){i.uniform3uiv(this.addr,e)}function YA(i,e){i.uniform4uiv(this.addr,e)}function QA(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);En(r,l)||(i.uniform1iv(this.addr,l),wn(r,l));let c;this.type===i.SAMPLER_2D_SHADOW?c=om:c=Iy;for(let d=0;d!==a;++d)t.setTexture2D(e[d]||c,l[d])}function ZA(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);En(r,l)||(i.uniform1iv(this.addr,l),wn(r,l));for(let c=0;c!==a;++c)t.setTexture3D(e[c]||Fy,l[c])}function JA(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);En(r,l)||(i.uniform1iv(this.addr,l),wn(r,l));for(let c=0;c!==a;++c)t.setTextureCube(e[c]||Oy,l[c])}function e2(i,e,t){const r=this.cache,a=e.length,l=Ed(t,a);En(r,l)||(i.uniform1iv(this.addr,l),wn(r,l));for(let c=0;c!==a;++c)t.setTexture2DArray(e[c]||Uy,l[c])}function t2(i){switch(i){case 5126:return FA;case 35664:return OA;case 35665:return kA;case 35666:return zA;case 35674:return BA;case 35675:return HA;case 35676:return VA;case 5124:case 35670:return GA;case 35667:case 35671:return jA;case 35668:case 35672:return WA;case 35669:case 35673:return XA;case 5125:return $A;case 36294:return qA;case 36295:return KA;case 36296:return YA;case 35678:case 36198:case 36298:case 36306:case 35682:return QA;case 35679:case 36299:case 36307:return ZA;case 35680:case 36300:case 36308:case 36293:return JA;case 36289:case 36303:case 36311:case 36292:return e2}}class n2{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.setValue=UA(t.type)}}class i2{constructor(e,t,r){this.id=e,this.addr=r,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=t2(t.type)}}class r2{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,r){const a=this.seq;for(let l=0,c=a.length;l!==c;++l){const d=a[l];d.setValue(e,t[d.id],r)}}}const Kf=/(\w+)(\])?(\[|\.)?/g;function Bv(i,e){i.seq.push(e),i.map[e.id]=e}function s2(i,e,t){const r=i.name,a=r.length;for(Kf.lastIndex=0;;){const l=Kf.exec(r),c=Kf.lastIndex;let d=l[1];const h=l[2]==="]",f=l[3];if(h&&(d=d|0),f===void 0||f==="["&&c+2===a){Bv(t,f===void 0?new n2(d,i,e):new i2(d,i,e));break}else{let p=t.map[d];p===void 0&&(p=new r2(d),Bv(t,p)),t=p}}}class Zu{constructor(e,t){this.seq=[],this.map={};const r=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let c=0;c<r;++c){const d=e.getActiveUniform(t,c),h=e.getUniformLocation(t,d.name);s2(d,h,this)}const a=[],l=[];for(const c of this.seq)c.type===e.SAMPLER_2D_SHADOW||c.type===e.SAMPLER_CUBE_SHADOW||c.type===e.SAMPLER_2D_ARRAY_SHADOW?a.push(c):l.push(c);a.length>0&&(this.seq=a.concat(l))}setValue(e,t,r,a){const l=this.map[t];l!==void 0&&l.setValue(e,r,a)}setOptional(e,t,r){const a=t[r];a!==void 0&&this.setValue(e,r,a)}static upload(e,t,r,a){for(let l=0,c=t.length;l!==c;++l){const d=t[l],h=r[d.id];h.needsUpdate!==!1&&d.setValue(e,h.value,a)}}static seqWithValue(e,t){const r=[];for(let a=0,l=e.length;a!==l;++a){const c=e[a];c.id in t&&r.push(c)}return r}}function Hv(i,e,t){const r=i.createShader(e);return i.shaderSource(r,t),i.compileShader(r),r}const a2=37297;let o2=0;function l2(i,e){const t=i.split(`
`),r=[],a=Math.max(e-6,0),l=Math.min(e+6,t.length);for(let c=a;c<l;c++){const d=c+1;r.push(`${d===e?">":" "} ${d}: ${t[c]}`)}return r.join(`
`)}const Vv=new pt;function c2(i){Tt._getMatrix(Vv,Tt.workingColorSpace,i);const e=`mat3( ${Vv.elements.map(t=>t.toFixed(4))} )`;switch(Tt.getTransfer(i)){case ld:return[e,"LinearTransferOETF"];case Bt:return[e,"sRGBTransferOETF"];default:return ot("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Gv(i,e,t){const r=i.getShaderParameter(e,i.COMPILE_STATUS),l=(i.getShaderInfoLog(e)||"").trim();if(r&&l==="")return"";const c=/ERROR: 0:(\d+)/.exec(l);if(c){const d=parseInt(c[1]);return t.toUpperCase()+`

`+l+`

`+l2(i.getShaderSource(e),d)}else return l}function u2(i,e){const t=c2(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const d2={[ay]:"Linear",[oy]:"Reinhard",[ly]:"Cineon",[Pm]:"ACESFilmic",[uy]:"AgX",[dy]:"Neutral",[cy]:"Custom"};function h2(i,e){const t=d2[e];return t===void 0?(ot("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const zu=new te;function f2(){Tt.getLuminanceCoefficients(zu);const i=zu.x.toFixed(4),e=zu.y.toFixed(4),t=zu.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function p2(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(zl).join(`
`)}function m2(i){const e=[];for(const t in i){const r=i[t];r!==!1&&e.push("#define "+t+" "+r)}return e.join(`
`)}function g2(i,e){const t={},r=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let a=0;a<r;a++){const l=i.getActiveAttrib(e,a),c=l.name;let d=1;l.type===i.FLOAT_MAT2&&(d=2),l.type===i.FLOAT_MAT3&&(d=3),l.type===i.FLOAT_MAT4&&(d=4),t[c]={type:l.type,location:i.getAttribLocation(e,c),locationSize:d}}return t}function zl(i){return i!==""}function jv(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Wv(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const x2=/^[ \t]*#include +<([\w\d./]+)>/gm;function lm(i){return i.replace(x2,_2)}const v2=new Map;function _2(i,e){let t=xt[e];if(t===void 0){const r=v2.get(e);if(r!==void 0)t=xt[r],ot('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,r);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return lm(t)}const y2=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Xv(i){return i.replace(y2,S2)}function S2(i,e,t,r){let a="";for(let l=parseInt(e);l<parseInt(t);l++)a+=r.replace(/\[\s*i\s*\]/g,"[ "+l+" ]").replace(/UNROLLED_LOOP_INDEX/g,l);return a}function $v(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}const M2={[Wu]:"SHADOWMAP_TYPE_PCF",[Fl]:"SHADOWMAP_TYPE_VSM"};function E2(i){return M2[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const w2={[Ea]:"ENVMAP_TYPE_CUBE",[Io]:"ENVMAP_TYPE_CUBE",[_d]:"ENVMAP_TYPE_CUBE_UV"};function b2(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":w2[i.envMapMode]||"ENVMAP_TYPE_CUBE"}const T2={[Io]:"ENVMAP_MODE_REFRACTION"};function C2(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":T2[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const R2={[Am]:"ENVMAP_BLENDING_MULTIPLY",[sb]:"ENVMAP_BLENDING_MIX",[ab]:"ENVMAP_BLENDING_ADD"};function A2(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":R2[i.combine]||"ENVMAP_BLENDING_NONE"}function P2(i){const e=i.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,r=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:r,maxMip:t}}function N2(i,e,t,r){const a=i.getContext(),l=t.defines;let c=t.vertexShader,d=t.fragmentShader;const h=E2(t),f=b2(t),g=C2(t),p=A2(t),v=P2(t),_=p2(t),E=m2(l),b=a.createProgram();let M,S,P=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(M=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(zl).join(`
`),M.length>0&&(M+=`
`),S=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E].filter(zl).join(`
`),S.length>0&&(S+=`
`)):(M=[$v(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+g:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(zl).join(`
`),S=[$v(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,E,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+f:"",t.envMap?"#define "+g:"",t.envMap?"#define "+p:"",v?"#define CUBEUV_TEXEL_WIDTH "+v.texelWidth:"",v?"#define CUBEUV_TEXEL_HEIGHT "+v.texelHeight:"",v?"#define CUBEUV_MAX_MIP "+v.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+h:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==xr?"#define TONE_MAPPING":"",t.toneMapping!==xr?xt.tonemapping_pars_fragment:"",t.toneMapping!==xr?h2("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",xt.colorspace_pars_fragment,u2("linearToOutputTexel",t.outputColorSpace),f2(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(zl).join(`
`)),c=lm(c),c=jv(c,t),c=Wv(c,t),d=lm(d),d=jv(d,t),d=Wv(d,t),c=Xv(c),d=Xv(d),t.isRawShaderMaterial!==!0&&(P=`#version 300 es
`,M=[_,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+M,S=["#define varying in",t.glslVersion===Yx?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Yx?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);const L=P+M+c,C=P+S+d,I=Hv(a,a.VERTEX_SHADER,L),N=Hv(a,a.FRAGMENT_SHADER,C);a.attachShader(b,I),a.attachShader(b,N),t.index0AttributeName!==void 0?a.bindAttribLocation(b,0,t.index0AttributeName):t.hasPositionAttribute===!0&&a.bindAttribLocation(b,0,"position"),a.linkProgram(b);function U(H){if(i.debug.checkShaderErrors){const X=a.getProgramInfoLog(b)||"",j=a.getShaderInfoLog(I)||"",le=a.getShaderInfoLog(N)||"",$=X.trim(),ue=j.trim(),J=le.trim();let K=!0,re=!0;if(a.getProgramParameter(b,a.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(a,b,I,N);else{const de=Gv(a,I,"vertex"),F=Gv(a,N,"fragment");Pt("WebGLProgram: Shader Error "+a.getError()+" - VALIDATE_STATUS "+a.getProgramParameter(b,a.VALIDATE_STATUS)+`

Material Name: `+H.name+`
Material Type: `+H.type+`

Program Info Log: `+$+`
`+de+`
`+F)}else $!==""?ot("WebGLProgram: Program Info Log:",$):(ue===""||J==="")&&(re=!1);re&&(H.diagnostics={runnable:K,programLog:$,vertexShader:{log:ue,prefix:M},fragmentShader:{log:J,prefix:S}})}a.deleteShader(I),a.deleteShader(N),w=new Zu(a,b),D=g2(a,b)}let w;this.getUniforms=function(){return w===void 0&&U(this),w};let D;this.getAttributes=function(){return D===void 0&&U(this),D};let z=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return z===!1&&(z=a.getProgramParameter(b,a2)),z},this.destroy=function(){r.releaseStatesOfProgram(this),a.deleteProgram(b),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=o2++,this.cacheKey=e,this.usedTimes=1,this.program=b,this.vertexShader=I,this.fragmentShader=N,this}let L2=0;class D2{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,r){const a=this._getShaderCacheForMaterial(e);return a.has(t)===!1&&(a.add(t),t.usedTimes++),a.has(r)===!1&&(a.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const r of t)r.usedTimes--,r.usedTimes===0&&this.shaderCache.delete(r.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let r=t.get(e);return r===void 0&&(r=new Set,t.set(e,r)),r}_getShaderStage(e){const t=this.shaderCache;let r=t.get(e);return r===void 0&&(r=new I2(e),t.set(e,r)),r}}class I2{constructor(e){this.id=L2++,this.code=e,this.usedTimes=0}}function U2(i){return i===wa||i===rd||i===sd}function F2(i,e,t,r,a,l){const c=new My,d=new D2,h=new Set,f=[],g=new Map,p=r.logarithmicDepthBuffer;let v=r.precision;const _={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function E(w){return h.add(w),w===0?"uv":`uv${w}`}function b(w,D,z,H,X,j){const le=H.fog,$=X.geometry,ue=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?H.environment:null,J=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap,K=e.get(w.envMap||ue,J),re=K&&K.mapping===_d?K.image.height:null,de=_[w.type];w.precision!==null&&(v=r.getMaxPrecision(w.precision),v!==w.precision&&ot("WebGLProgram.getParameters:",w.precision,"not supported, using",v,"instead."));const F=$.morphAttributes.position||$.morphAttributes.normal||$.morphAttributes.color,ee=F!==void 0?F.length:0;let Ce=0;$.morphAttributes.position!==void 0&&(Ce=1),$.morphAttributes.normal!==void 0&&(Ce=2),$.morphAttributes.color!==void 0&&(Ce=3);let Ve,Ge,V,xe;if(de){const Xe=ur[de];Ve=Xe.vertexShader,Ge=Xe.fragmentShader}else{Ve=w.vertexShader,Ge=w.fragmentShader;const Xe=d.getVertexShaderStage(w),Gt=d.getFragmentShaderStage(w);d.update(w,Xe,Gt),V=Xe.id,xe=Gt.id}const fe=i.getRenderTarget(),ne=i.state.buffers.depth.getReversed(),Le=X.isInstancedMesh===!0,qe=X.isBatchedMesh===!0,Vt=!!w.map,dt=!!w.matcap,Dt=!!K,Ct=!!w.aoMap,Et=!!w.lightMap,Zt=!!w.bumpMap&&w.wireframe===!1,un=!!w.normalMap,dn=!!w.displacementMap,sn=!!w.emissiveMap,Ot=!!w.metalnessMap,Jt=!!w.roughnessMap,Q=w.anisotropy>0,Pn=w.clearcoat>0,Nt=w.dispersion>0,O=w.iridescence>0,T=w.sheen>0,ie=w.transmission>0,he=Q&&!!w.anisotropyMap,ge=Pn&&!!w.clearcoatMap,be=Pn&&!!w.clearcoatNormalMap,De=Pn&&!!w.clearcoatRoughnessMap,ve=O&&!!w.iridescenceMap,ye=O&&!!w.iridescenceThicknessMap,Ue=T&&!!w.sheenColorMap,Ze=T&&!!w.sheenRoughnessMap,Fe=!!w.specularMap,Ne=!!w.specularColorMap,nt=!!w.specularIntensityMap,rt=ie&&!!w.transmissionMap,lt=ie&&!!w.thicknessMap,q=!!w.gradientMap,Pe=!!w.alphaMap,_e=w.alphaTest>0,Ie=!!w.alphaHash,Oe=!!w.extensions;let Se=xr;w.toneMapped&&(fe===null||fe.isXRRenderTarget===!0)&&(Se=i.toneMapping);const Ke={shaderID:de,shaderType:w.type,shaderName:w.name,vertexShader:Ve,fragmentShader:Ge,defines:w.defines,customVertexShaderID:V,customFragmentShaderID:xe,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:v,batching:qe,batchingColor:qe&&X._colorsTexture!==null,instancing:Le,instancingColor:Le&&X.instanceColor!==null,instancingMorph:Le&&X.morphTexture!==null,outputColorSpace:fe===null?i.outputColorSpace:fe.isXRRenderTarget===!0?fe.texture.colorSpace:Tt.workingColorSpace,alphaToCoverage:!!w.alphaToCoverage,map:Vt,matcap:dt,envMap:Dt,envMapMode:Dt&&K.mapping,envMapCubeUVHeight:re,aoMap:Ct,lightMap:Et,bumpMap:Zt,normalMap:un,displacementMap:dn,emissiveMap:sn,normalMapObjectSpace:un&&w.normalMapType===cb,normalMapTangentSpace:un&&w.normalMapType===ad,packedNormalMap:un&&w.normalMapType===ad&&U2(w.normalMap.format),metalnessMap:Ot,roughnessMap:Jt,anisotropy:Q,anisotropyMap:he,clearcoat:Pn,clearcoatMap:ge,clearcoatNormalMap:be,clearcoatRoughnessMap:De,dispersion:Nt,iridescence:O,iridescenceMap:ve,iridescenceThicknessMap:ye,sheen:T,sheenColorMap:Ue,sheenRoughnessMap:Ze,specularMap:Fe,specularColorMap:Ne,specularIntensityMap:nt,transmission:ie,transmissionMap:rt,thicknessMap:lt,gradientMap:q,opaque:w.transparent===!1&&w.blending===go&&w.alphaToCoverage===!1,alphaMap:Pe,alphaTest:_e,alphaHash:Ie,combine:w.combine,mapUv:Vt&&E(w.map.channel),aoMapUv:Ct&&E(w.aoMap.channel),lightMapUv:Et&&E(w.lightMap.channel),bumpMapUv:Zt&&E(w.bumpMap.channel),normalMapUv:un&&E(w.normalMap.channel),displacementMapUv:dn&&E(w.displacementMap.channel),emissiveMapUv:sn&&E(w.emissiveMap.channel),metalnessMapUv:Ot&&E(w.metalnessMap.channel),roughnessMapUv:Jt&&E(w.roughnessMap.channel),anisotropyMapUv:he&&E(w.anisotropyMap.channel),clearcoatMapUv:ge&&E(w.clearcoatMap.channel),clearcoatNormalMapUv:be&&E(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:De&&E(w.clearcoatRoughnessMap.channel),iridescenceMapUv:ve&&E(w.iridescenceMap.channel),iridescenceThicknessMapUv:ye&&E(w.iridescenceThicknessMap.channel),sheenColorMapUv:Ue&&E(w.sheenColorMap.channel),sheenRoughnessMapUv:Ze&&E(w.sheenRoughnessMap.channel),specularMapUv:Fe&&E(w.specularMap.channel),specularColorMapUv:Ne&&E(w.specularColorMap.channel),specularIntensityMapUv:nt&&E(w.specularIntensityMap.channel),transmissionMapUv:rt&&E(w.transmissionMap.channel),thicknessMapUv:lt&&E(w.thicknessMap.channel),alphaMapUv:Pe&&E(w.alphaMap.channel),vertexTangents:!!$.attributes.tangent&&(un||Q),vertexNormals:!!$.attributes.normal,vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!$.attributes.color&&$.attributes.color.itemSize===4,pointsUvs:X.isPoints===!0&&!!$.attributes.uv&&(Vt||Pe),fog:!!le,useFog:w.fog===!0,fogExp2:!!le&&le.isFogExp2,flatShading:w.wireframe===!1&&(w.flatShading===!0||$.attributes.normal===void 0&&un===!1&&(w.isMeshLambertMaterial||w.isMeshPhongMaterial||w.isMeshStandardMaterial||w.isMeshPhysicalMaterial)),sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:p,reversedDepthBuffer:ne,skinning:X.isSkinnedMesh===!0,hasPositionAttribute:$.attributes.position!==void 0,morphTargets:$.morphAttributes.position!==void 0,morphNormals:$.morphAttributes.normal!==void 0,morphColors:$.morphAttributes.color!==void 0,morphTargetsCount:ee,morphTextureStride:Ce,numDirLights:D.directional.length,numPointLights:D.point.length,numSpotLights:D.spot.length,numSpotLightMaps:D.spotLightMap.length,numRectAreaLights:D.rectArea.length,numHemiLights:D.hemi.length,numDirLightShadows:D.directionalShadowMap.length,numPointLightShadows:D.pointShadowMap.length,numSpotLightShadows:D.spotShadowMap.length,numSpotLightShadowsWithMaps:D.numSpotLightShadowsWithMaps,numLightProbes:D.numLightProbes,numLightProbeGrids:j.length,numClippingPlanes:l.numPlanes,numClipIntersection:l.numIntersection,dithering:w.dithering,shadowMapEnabled:i.shadowMap.enabled&&z.length>0,shadowMapType:i.shadowMap.type,toneMapping:Se,decodeVideoTexture:Vt&&w.map.isVideoTexture===!0&&Tt.getTransfer(w.map.colorSpace)===Bt,decodeVideoTextureEmissive:sn&&w.emissiveMap.isVideoTexture===!0&&Tt.getTransfer(w.emissiveMap.colorSpace)===Bt,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===hr,flipSided:w.side===hi,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:Oe&&w.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Oe&&w.extensions.multiDraw===!0||qe)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Ke.vertexUv1s=h.has(1),Ke.vertexUv2s=h.has(2),Ke.vertexUv3s=h.has(3),h.clear(),Ke}function M(w){const D=[];if(w.shaderID?D.push(w.shaderID):(D.push(w.customVertexShaderID),D.push(w.customFragmentShaderID)),w.defines!==void 0)for(const z in w.defines)D.push(z),D.push(w.defines[z]);return w.isRawShaderMaterial===!1&&(S(D,w),P(D,w),D.push(i.outputColorSpace)),D.push(w.customProgramCacheKey),D.join()}function S(w,D){w.push(D.precision),w.push(D.outputColorSpace),w.push(D.envMapMode),w.push(D.envMapCubeUVHeight),w.push(D.mapUv),w.push(D.alphaMapUv),w.push(D.lightMapUv),w.push(D.aoMapUv),w.push(D.bumpMapUv),w.push(D.normalMapUv),w.push(D.displacementMapUv),w.push(D.emissiveMapUv),w.push(D.metalnessMapUv),w.push(D.roughnessMapUv),w.push(D.anisotropyMapUv),w.push(D.clearcoatMapUv),w.push(D.clearcoatNormalMapUv),w.push(D.clearcoatRoughnessMapUv),w.push(D.iridescenceMapUv),w.push(D.iridescenceThicknessMapUv),w.push(D.sheenColorMapUv),w.push(D.sheenRoughnessMapUv),w.push(D.specularMapUv),w.push(D.specularColorMapUv),w.push(D.specularIntensityMapUv),w.push(D.transmissionMapUv),w.push(D.thicknessMapUv),w.push(D.combine),w.push(D.fogExp2),w.push(D.sizeAttenuation),w.push(D.morphTargetsCount),w.push(D.morphAttributeCount),w.push(D.numDirLights),w.push(D.numPointLights),w.push(D.numSpotLights),w.push(D.numSpotLightMaps),w.push(D.numHemiLights),w.push(D.numRectAreaLights),w.push(D.numDirLightShadows),w.push(D.numPointLightShadows),w.push(D.numSpotLightShadows),w.push(D.numSpotLightShadowsWithMaps),w.push(D.numLightProbes),w.push(D.shadowMapType),w.push(D.toneMapping),w.push(D.numClippingPlanes),w.push(D.numClipIntersection),w.push(D.depthPacking)}function P(w,D){c.disableAll(),D.instancing&&c.enable(0),D.instancingColor&&c.enable(1),D.instancingMorph&&c.enable(2),D.matcap&&c.enable(3),D.envMap&&c.enable(4),D.normalMapObjectSpace&&c.enable(5),D.normalMapTangentSpace&&c.enable(6),D.clearcoat&&c.enable(7),D.iridescence&&c.enable(8),D.alphaTest&&c.enable(9),D.vertexColors&&c.enable(10),D.vertexAlphas&&c.enable(11),D.vertexUv1s&&c.enable(12),D.vertexUv2s&&c.enable(13),D.vertexUv3s&&c.enable(14),D.vertexTangents&&c.enable(15),D.anisotropy&&c.enable(16),D.alphaHash&&c.enable(17),D.batching&&c.enable(18),D.dispersion&&c.enable(19),D.batchingColor&&c.enable(20),D.gradientMap&&c.enable(21),D.packedNormalMap&&c.enable(22),D.vertexNormals&&c.enable(23),w.push(c.mask),c.disableAll(),D.fog&&c.enable(0),D.useFog&&c.enable(1),D.flatShading&&c.enable(2),D.logarithmicDepthBuffer&&c.enable(3),D.reversedDepthBuffer&&c.enable(4),D.skinning&&c.enable(5),D.morphTargets&&c.enable(6),D.morphNormals&&c.enable(7),D.morphColors&&c.enable(8),D.premultipliedAlpha&&c.enable(9),D.shadowMapEnabled&&c.enable(10),D.doubleSided&&c.enable(11),D.flipSided&&c.enable(12),D.useDepthPacking&&c.enable(13),D.dithering&&c.enable(14),D.transmission&&c.enable(15),D.sheen&&c.enable(16),D.opaque&&c.enable(17),D.pointsUvs&&c.enable(18),D.decodeVideoTexture&&c.enable(19),D.decodeVideoTextureEmissive&&c.enable(20),D.alphaToCoverage&&c.enable(21),D.numLightProbeGrids>0&&c.enable(22),D.hasPositionAttribute&&c.enable(23),w.push(c.mask)}function L(w){const D=_[w.type];let z;if(D){const H=ur[D];z=qb.clone(H.uniforms)}else z=w.uniforms;return z}function C(w,D){let z=g.get(D);return z!==void 0?++z.usedTimes:(z=new N2(i,D,w,a),f.push(z),g.set(D,z)),z}function I(w){if(--w.usedTimes===0){const D=f.indexOf(w);f[D]=f[f.length-1],f.pop(),g.delete(w.cacheKey),w.destroy()}}function N(w){d.remove(w)}function U(){d.dispose()}return{getParameters:b,getProgramCacheKey:M,getUniforms:L,acquireProgram:C,releaseProgram:I,releaseShaderCache:N,programs:f,dispose:U}}function O2(){let i=new WeakMap;function e(c){return i.has(c)}function t(c){let d=i.get(c);return d===void 0&&(d={},i.set(c,d)),d}function r(c){i.delete(c)}function a(c,d,h){i.get(c)[d]=h}function l(){i=new WeakMap}return{has:e,get:t,remove:r,update:a,dispose:l}}function k2(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function qv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Kv(){const i=[];let e=0;const t=[],r=[],a=[];function l(){e=0,t.length=0,r.length=0,a.length=0}function c(v){let _=0;return v.isInstancedMesh&&(_+=2),v.isSkinnedMesh&&(_+=1),_}function d(v,_,E,b,M,S){let P=i[e];return P===void 0?(P={id:v.id,object:v,geometry:_,material:E,materialVariant:c(v),groupOrder:b,renderOrder:v.renderOrder,z:M,group:S},i[e]=P):(P.id=v.id,P.object=v,P.geometry=_,P.material=E,P.materialVariant=c(v),P.groupOrder=b,P.renderOrder=v.renderOrder,P.z=M,P.group=S),e++,P}function h(v,_,E,b,M,S){const P=d(v,_,E,b,M,S);E.transmission>0?r.push(P):E.transparent===!0?a.push(P):t.push(P)}function f(v,_,E,b,M,S){const P=d(v,_,E,b,M,S);E.transmission>0?r.unshift(P):E.transparent===!0?a.unshift(P):t.unshift(P)}function g(v,_,E){t.length>1&&t.sort(v||k2),r.length>1&&r.sort(_||qv),a.length>1&&a.sort(_||qv),E&&(t.reverse(),r.reverse(),a.reverse())}function p(){for(let v=e,_=i.length;v<_;v++){const E=i[v];if(E.id===null)break;E.id=null,E.object=null,E.geometry=null,E.material=null,E.group=null}}return{opaque:t,transmissive:r,transparent:a,init:l,push:h,unshift:f,finish:p,sort:g}}function z2(){let i=new WeakMap;function e(r,a){const l=i.get(r);let c;return l===void 0?(c=new Kv,i.set(r,[c])):a>=l.length?(c=new Kv,l.push(c)):c=l[a],c}function t(){i=new WeakMap}return{get:e,dispose:t}}function B2(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new te,color:new gt};break;case"SpotLight":t={position:new te,direction:new te,color:new gt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new te,color:new gt,distance:0,decay:0};break;case"HemisphereLight":t={direction:new te,skyColor:new gt,groundColor:new gt};break;case"RectAreaLight":t={color:new gt,position:new te,halfWidth:new te,halfHeight:new te};break}return i[e.id]=t,t}}}function H2(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ut,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let V2=0;function G2(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function j2(i){const e=new B2,t=H2(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let f=0;f<9;f++)r.probe.push(new te);const a=new te,l=new rn,c=new rn;function d(f){let g=0,p=0,v=0;for(let D=0;D<9;D++)r.probe[D].set(0,0,0);let _=0,E=0,b=0,M=0,S=0,P=0,L=0,C=0,I=0,N=0,U=0;f.sort(G2);for(let D=0,z=f.length;D<z;D++){const H=f[D],X=H.color,j=H.intensity,le=H.distance;let $=null;if(H.shadow&&H.shadow.map&&(H.shadow.map.texture.format===wa?$=H.shadow.map.texture:$=H.shadow.map.depthTexture||H.shadow.map.texture),H.isAmbientLight)g+=X.r*j,p+=X.g*j,v+=X.b*j;else if(H.isLightProbe){for(let ue=0;ue<9;ue++)r.probe[ue].addScaledVector(H.sh.coefficients[ue],j);U++}else if(H.isDirectionalLight){const ue=e.get(H);if(ue.color.copy(H.color).multiplyScalar(H.intensity),H.castShadow){const J=H.shadow,K=t.get(H);K.shadowIntensity=J.intensity,K.shadowBias=J.bias,K.shadowNormalBias=J.normalBias,K.shadowRadius=J.radius,K.shadowMapSize=J.mapSize,r.directionalShadow[_]=K,r.directionalShadowMap[_]=$,r.directionalShadowMatrix[_]=H.shadow.matrix,P++}r.directional[_]=ue,_++}else if(H.isSpotLight){const ue=e.get(H);ue.position.setFromMatrixPosition(H.matrixWorld),ue.color.copy(X).multiplyScalar(j),ue.distance=le,ue.coneCos=Math.cos(H.angle),ue.penumbraCos=Math.cos(H.angle*(1-H.penumbra)),ue.decay=H.decay,r.spot[b]=ue;const J=H.shadow;if(H.map&&(r.spotLightMap[I]=H.map,I++,J.updateMatrices(H),H.castShadow&&N++),r.spotLightMatrix[b]=J.matrix,H.castShadow){const K=t.get(H);K.shadowIntensity=J.intensity,K.shadowBias=J.bias,K.shadowNormalBias=J.normalBias,K.shadowRadius=J.radius,K.shadowMapSize=J.mapSize,r.spotShadow[b]=K,r.spotShadowMap[b]=$,C++}b++}else if(H.isRectAreaLight){const ue=e.get(H);ue.color.copy(X).multiplyScalar(j),ue.halfWidth.set(H.width*.5,0,0),ue.halfHeight.set(0,H.height*.5,0),r.rectArea[M]=ue,M++}else if(H.isPointLight){const ue=e.get(H);if(ue.color.copy(H.color).multiplyScalar(H.intensity),ue.distance=H.distance,ue.decay=H.decay,H.castShadow){const J=H.shadow,K=t.get(H);K.shadowIntensity=J.intensity,K.shadowBias=J.bias,K.shadowNormalBias=J.normalBias,K.shadowRadius=J.radius,K.shadowMapSize=J.mapSize,K.shadowCameraNear=J.camera.near,K.shadowCameraFar=J.camera.far,r.pointShadow[E]=K,r.pointShadowMap[E]=$,r.pointShadowMatrix[E]=H.shadow.matrix,L++}r.point[E]=ue,E++}else if(H.isHemisphereLight){const ue=e.get(H);ue.skyColor.copy(H.color).multiplyScalar(j),ue.groundColor.copy(H.groundColor).multiplyScalar(j),r.hemi[S]=ue,S++}}M>0&&(i.has("OES_texture_float_linear")===!0?(r.rectAreaLTC1=ke.LTC_FLOAT_1,r.rectAreaLTC2=ke.LTC_FLOAT_2):(r.rectAreaLTC1=ke.LTC_HALF_1,r.rectAreaLTC2=ke.LTC_HALF_2)),r.ambient[0]=g,r.ambient[1]=p,r.ambient[2]=v;const w=r.hash;(w.directionalLength!==_||w.pointLength!==E||w.spotLength!==b||w.rectAreaLength!==M||w.hemiLength!==S||w.numDirectionalShadows!==P||w.numPointShadows!==L||w.numSpotShadows!==C||w.numSpotMaps!==I||w.numLightProbes!==U)&&(r.directional.length=_,r.spot.length=b,r.rectArea.length=M,r.point.length=E,r.hemi.length=S,r.directionalShadow.length=P,r.directionalShadowMap.length=P,r.pointShadow.length=L,r.pointShadowMap.length=L,r.spotShadow.length=C,r.spotShadowMap.length=C,r.directionalShadowMatrix.length=P,r.pointShadowMatrix.length=L,r.spotLightMatrix.length=C+I-N,r.spotLightMap.length=I,r.numSpotLightShadowsWithMaps=N,r.numLightProbes=U,w.directionalLength=_,w.pointLength=E,w.spotLength=b,w.rectAreaLength=M,w.hemiLength=S,w.numDirectionalShadows=P,w.numPointShadows=L,w.numSpotShadows=C,w.numSpotMaps=I,w.numLightProbes=U,r.version=V2++)}function h(f,g){let p=0,v=0,_=0,E=0,b=0;const M=g.matrixWorldInverse;for(let S=0,P=f.length;S<P;S++){const L=f[S];if(L.isDirectionalLight){const C=r.directional[p];C.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(M),p++}else if(L.isSpotLight){const C=r.spot[_];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(M),C.direction.setFromMatrixPosition(L.matrixWorld),a.setFromMatrixPosition(L.target.matrixWorld),C.direction.sub(a),C.direction.transformDirection(M),_++}else if(L.isRectAreaLight){const C=r.rectArea[E];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(M),c.identity(),l.copy(L.matrixWorld),l.premultiply(M),c.extractRotation(l),C.halfWidth.set(L.width*.5,0,0),C.halfHeight.set(0,L.height*.5,0),C.halfWidth.applyMatrix4(c),C.halfHeight.applyMatrix4(c),E++}else if(L.isPointLight){const C=r.point[v];C.position.setFromMatrixPosition(L.matrixWorld),C.position.applyMatrix4(M),v++}else if(L.isHemisphereLight){const C=r.hemi[b];C.direction.setFromMatrixPosition(L.matrixWorld),C.direction.transformDirection(M),b++}}}return{setup:d,setupView:h,state:r}}function Yv(i){const e=new j2(i),t=[],r=[],a=[];function l(v){p.camera=v,t.length=0,r.length=0,a.length=0}function c(v){t.push(v)}function d(v){r.push(v)}function h(v){a.push(v)}function f(){e.setup(t)}function g(v){e.setupView(t,v)}const p={lightsArray:t,shadowsArray:r,lightProbeGridArray:a,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:l,state:p,setupLights:f,setupLightsView:g,pushLight:c,pushShadow:d,pushLightProbeGrid:h}}function W2(i){let e=new WeakMap;function t(a,l=0){const c=e.get(a);let d;return c===void 0?(d=new Yv(i),e.set(a,[d])):l>=c.length?(d=new Yv(i),c.push(d)):d=c[l],d}function r(){e=new WeakMap}return{get:t,dispose:r}}const X2=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,$2=`uniform sampler2D shadow_pass;
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
}`,q2=[new te(1,0,0),new te(-1,0,0),new te(0,1,0),new te(0,-1,0),new te(0,0,1),new te(0,0,-1)],K2=[new te(0,-1,0),new te(0,-1,0),new te(0,0,1),new te(0,0,-1),new te(0,-1,0),new te(0,-1,0)],Qv=new rn,Il=new te,Yf=new te;function Y2(i,e,t){let r=new Bm;const a=new ut,l=new ut,c=new cn,d=new Jb,h=new eT,f={},g=t.maxTextureSize,p={[Os]:hi,[hi]:Os,[hr]:hr},v=new Mr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ut},radius:{value:4}},vertexShader:X2,fragmentShader:$2}),_=v.clone();_.defines.HORIZONTAL_PASS=1;const E=new Mi;E.setAttribute("position",new _r(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const b=new Qi(E,v),M=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wu;let S=this.type;this.render=function(N,U,w){if(M.enabled===!1||M.autoUpdate===!1&&M.needsUpdate===!1||N.length===0)return;this.type===Bw&&(ot("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wu);const D=i.getRenderTarget(),z=i.getActiveCubeFace(),H=i.getActiveMipmapLevel(),X=i.state;X.setBlending(Wr),X.buffers.depth.getReversed()===!0?X.buffers.color.setClear(0,0,0,0):X.buffers.color.setClear(1,1,1,1),X.buffers.depth.setTest(!0),X.setScissorTest(!1);const j=S!==this.type;j&&U.traverse(function(le){le.material&&(Array.isArray(le.material)?le.material.forEach($=>$.needsUpdate=!0):le.material.needsUpdate=!0)});for(let le=0,$=N.length;le<$;le++){const ue=N[le],J=ue.shadow;if(J===void 0){ot("WebGLShadowMap:",ue,"has no shadow.");continue}if(J.autoUpdate===!1&&J.needsUpdate===!1)continue;a.copy(J.mapSize);const K=J.getFrameExtents();a.multiply(K),l.copy(J.mapSize),(a.x>g||a.y>g)&&(a.x>g&&(l.x=Math.floor(g/K.x),a.x=l.x*K.x,J.mapSize.x=l.x),a.y>g&&(l.y=Math.floor(g/K.y),a.y=l.y*K.y,J.mapSize.y=l.y));const re=i.state.buffers.depth.getReversed();if(J.camera._reversedDepth=re,J.map===null||j===!0){if(J.map!==null&&(J.map.depthTexture!==null&&(J.map.depthTexture.dispose(),J.map.depthTexture=null),J.map.dispose()),this.type===Fl){if(ue.isPointLight){ot("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}J.map=new vr(a.x,a.y,{format:wa,type:Kr,minFilter:jn,magFilter:jn,generateMipmaps:!1}),J.map.texture.name=ue.name+".shadowMap",J.map.depthTexture=new Uo(a.x,a.y,pr),J.map.depthTexture.name=ue.name+".shadowMapDepth",J.map.depthTexture.format=Yr,J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=Un,J.map.depthTexture.magFilter=Un}else ue.isPointLight?(J.map=new Dy(a.x),J.map.depthTexture=new Xb(a.x,yr)):(J.map=new vr(a.x,a.y),J.map.depthTexture=new Uo(a.x,a.y,yr)),J.map.depthTexture.name=ue.name+".shadowMap",J.map.depthTexture.format=Yr,this.type===Wu?(J.map.depthTexture.compareFunction=re?km:Om,J.map.depthTexture.minFilter=jn,J.map.depthTexture.magFilter=jn):(J.map.depthTexture.compareFunction=null,J.map.depthTexture.minFilter=Un,J.map.depthTexture.magFilter=Un);J.camera.updateProjectionMatrix()}const de=J.map.isWebGLCubeRenderTarget?6:1;for(let F=0;F<de;F++){if(J.map.isWebGLCubeRenderTarget)i.setRenderTarget(J.map,F),i.clear();else{F===0&&(i.setRenderTarget(J.map),i.clear());const ee=J.getViewport(F);c.set(l.x*ee.x,l.y*ee.y,l.x*ee.z,l.y*ee.w),X.viewport(c)}if(ue.isPointLight){const ee=J.camera,Ce=J.matrix,Ve=ue.distance||ee.far;Ve!==ee.far&&(ee.far=Ve,ee.updateProjectionMatrix()),Il.setFromMatrixPosition(ue.matrixWorld),ee.position.copy(Il),Yf.copy(ee.position),Yf.add(q2[F]),ee.up.copy(K2[F]),ee.lookAt(Yf),ee.updateMatrixWorld(),Ce.makeTranslation(-Il.x,-Il.y,-Il.z),Qv.multiplyMatrices(ee.projectionMatrix,ee.matrixWorldInverse),J._frustum.setFromProjectionMatrix(Qv,ee.coordinateSystem,ee.reversedDepth)}else J.updateMatrices(ue);r=J.getFrustum(),C(U,w,J.camera,ue,this.type)}J.isPointLightShadow!==!0&&this.type===Fl&&P(J,w),J.needsUpdate=!1}S=this.type,M.needsUpdate=!1,i.setRenderTarget(D,z,H)};function P(N,U){const w=e.update(b);v.defines.VSM_SAMPLES!==N.blurSamples&&(v.defines.VSM_SAMPLES=N.blurSamples,_.defines.VSM_SAMPLES=N.blurSamples,v.needsUpdate=!0,_.needsUpdate=!0),N.mapPass===null&&(N.mapPass=new vr(a.x,a.y,{format:wa,type:Kr})),v.uniforms.shadow_pass.value=N.map.depthTexture,v.uniforms.resolution.value=N.mapSize,v.uniforms.radius.value=N.radius,i.setRenderTarget(N.mapPass),i.clear(),i.renderBufferDirect(U,null,w,v,b,null),_.uniforms.shadow_pass.value=N.mapPass.texture,_.uniforms.resolution.value=N.mapSize,_.uniforms.radius.value=N.radius,i.setRenderTarget(N.map),i.clear(),i.renderBufferDirect(U,null,w,_,b,null)}function L(N,U,w,D){let z=null;const H=w.isPointLight===!0?N.customDistanceMaterial:N.customDepthMaterial;if(H!==void 0)z=H;else if(z=w.isPointLight===!0?h:d,i.localClippingEnabled&&U.clipShadows===!0&&Array.isArray(U.clippingPlanes)&&U.clippingPlanes.length!==0||U.displacementMap&&U.displacementScale!==0||U.alphaMap&&U.alphaTest>0||U.map&&U.alphaTest>0||U.alphaToCoverage===!0){const X=z.uuid,j=U.uuid;let le=f[X];le===void 0&&(le={},f[X]=le);let $=le[j];$===void 0&&($=z.clone(),le[j]=$,U.addEventListener("dispose",I)),z=$}if(z.visible=U.visible,z.wireframe=U.wireframe,D===Fl?z.side=U.shadowSide!==null?U.shadowSide:U.side:z.side=U.shadowSide!==null?U.shadowSide:p[U.side],z.alphaMap=U.alphaMap,z.alphaTest=U.alphaToCoverage===!0?.5:U.alphaTest,z.map=U.map,z.clipShadows=U.clipShadows,z.clippingPlanes=U.clippingPlanes,z.clipIntersection=U.clipIntersection,z.displacementMap=U.displacementMap,z.displacementScale=U.displacementScale,z.displacementBias=U.displacementBias,z.wireframeLinewidth=U.wireframeLinewidth,z.linewidth=U.linewidth,w.isPointLight===!0&&z.isMeshDistanceMaterial===!0){const X=i.properties.get(z);X.light=w}return z}function C(N,U,w,D,z){if(N.visible===!1)return;if(N.layers.test(U.layers)&&(N.isMesh||N.isLine||N.isPoints)&&(N.castShadow||N.receiveShadow&&z===Fl)&&(!N.frustumCulled||r.intersectsObject(N))){N.modelViewMatrix.multiplyMatrices(w.matrixWorldInverse,N.matrixWorld);const j=e.update(N),le=N.material;if(Array.isArray(le)){const $=j.groups;for(let ue=0,J=$.length;ue<J;ue++){const K=$[ue],re=le[K.materialIndex];if(re&&re.visible){const de=L(N,re,D,z);N.onBeforeShadow(i,N,U,w,j,de,K),i.renderBufferDirect(w,null,j,de,N,K),N.onAfterShadow(i,N,U,w,j,de,K)}}}else if(le.visible){const $=L(N,le,D,z);N.onBeforeShadow(i,N,U,w,j,$,null),i.renderBufferDirect(w,null,j,$,N,null),N.onAfterShadow(i,N,U,w,j,$,null)}}const X=N.children;for(let j=0,le=X.length;j<le;j++)C(X[j],U,w,D,z)}function I(N){N.target.removeEventListener("dispose",I);for(const w in f){const D=f[w],z=N.target.uuid;z in D&&(D[z].dispose(),delete D[z])}}}function Q2(i,e){function t(){let q=!1;const Pe=new cn;let _e=null;const Ie=new cn(0,0,0,0);return{setMask:function(Oe){_e!==Oe&&!q&&(i.colorMask(Oe,Oe,Oe,Oe),_e=Oe)},setLocked:function(Oe){q=Oe},setClear:function(Oe,Se,Ke,Xe,Gt){Gt===!0&&(Oe*=Xe,Se*=Xe,Ke*=Xe),Pe.set(Oe,Se,Ke,Xe),Ie.equals(Pe)===!1&&(i.clearColor(Oe,Se,Ke,Xe),Ie.copy(Pe))},reset:function(){q=!1,_e=null,Ie.set(-1,0,0,0)}}}function r(){let q=!1,Pe=!1,_e=null,Ie=null,Oe=null;return{setReversed:function(Se){if(Pe!==Se){const Ke=e.get("EXT_clip_control");Se?Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.ZERO_TO_ONE_EXT):Ke.clipControlEXT(Ke.LOWER_LEFT_EXT,Ke.NEGATIVE_ONE_TO_ONE_EXT),Pe=Se;const Xe=Oe;Oe=null,this.setClear(Xe)}},getReversed:function(){return Pe},setTest:function(Se){Se?fe(i.DEPTH_TEST):ne(i.DEPTH_TEST)},setMask:function(Se){_e!==Se&&!q&&(i.depthMask(Se),_e=Se)},setFunc:function(Se){if(Pe&&(Se=_b[Se]),Ie!==Se){switch(Se){case yp:i.depthFunc(i.NEVER);break;case Sp:i.depthFunc(i.ALWAYS);break;case Mp:i.depthFunc(i.LESS);break;case Do:i.depthFunc(i.LEQUAL);break;case Ep:i.depthFunc(i.EQUAL);break;case wp:i.depthFunc(i.GEQUAL);break;case bp:i.depthFunc(i.GREATER);break;case Tp:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}Ie=Se}},setLocked:function(Se){q=Se},setClear:function(Se){Oe!==Se&&(Oe=Se,Pe&&(Se=1-Se),i.clearDepth(Se))},reset:function(){q=!1,_e=null,Ie=null,Oe=null,Pe=!1}}}function a(){let q=!1,Pe=null,_e=null,Ie=null,Oe=null,Se=null,Ke=null,Xe=null,Gt=null;return{setTest:function(It){q||(It?fe(i.STENCIL_TEST):ne(i.STENCIL_TEST))},setMask:function(It){Pe!==It&&!q&&(i.stencilMask(It),Pe=It)},setFunc:function(It,Fn,wi){(_e!==It||Ie!==Fn||Oe!==wi)&&(i.stencilFunc(It,Fn,wi),_e=It,Ie=Fn,Oe=wi)},setOp:function(It,Fn,wi){(Se!==It||Ke!==Fn||Xe!==wi)&&(i.stencilOp(It,Fn,wi),Se=It,Ke=Fn,Xe=wi)},setLocked:function(It){q=It},setClear:function(It){Gt!==It&&(i.clearStencil(It),Gt=It)},reset:function(){q=!1,Pe=null,_e=null,Ie=null,Oe=null,Se=null,Ke=null,Xe=null,Gt=null}}}const l=new t,c=new r,d=new a,h=new WeakMap,f=new WeakMap;let g={},p={},v={},_=new WeakMap,E=[],b=null,M=!1,S=null,P=null,L=null,C=null,I=null,N=null,U=null,w=new gt(0,0,0),D=0,z=!1,H=null,X=null,j=null,le=null,$=null;const ue=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let J=!1,K=0;const re=i.getParameter(i.VERSION);re.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(re)[1]),J=K>=1):re.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(re)[1]),J=K>=2);let de=null,F={};const ee=i.getParameter(i.SCISSOR_BOX),Ce=i.getParameter(i.VIEWPORT),Ve=new cn().fromArray(ee),Ge=new cn().fromArray(Ce);function V(q,Pe,_e,Ie){const Oe=new Uint8Array(4),Se=i.createTexture();i.bindTexture(q,Se),i.texParameteri(q,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(q,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Ke=0;Ke<_e;Ke++)q===i.TEXTURE_3D||q===i.TEXTURE_2D_ARRAY?i.texImage3D(Pe,0,i.RGBA,1,1,Ie,0,i.RGBA,i.UNSIGNED_BYTE,Oe):i.texImage2D(Pe+Ke,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,Oe);return Se}const xe={};xe[i.TEXTURE_2D]=V(i.TEXTURE_2D,i.TEXTURE_2D,1),xe[i.TEXTURE_CUBE_MAP]=V(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),xe[i.TEXTURE_2D_ARRAY]=V(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),xe[i.TEXTURE_3D]=V(i.TEXTURE_3D,i.TEXTURE_3D,1,1),l.setClear(0,0,0,1),c.setClear(1),d.setClear(0),fe(i.DEPTH_TEST),c.setFunc(Do),Zt(!1),un(jx),fe(i.CULL_FACE),Ct(Wr);function fe(q){g[q]!==!0&&(i.enable(q),g[q]=!0)}function ne(q){g[q]!==!1&&(i.disable(q),g[q]=!1)}function Le(q,Pe){return v[q]!==Pe?(i.bindFramebuffer(q,Pe),v[q]=Pe,q===i.DRAW_FRAMEBUFFER&&(v[i.FRAMEBUFFER]=Pe),q===i.FRAMEBUFFER&&(v[i.DRAW_FRAMEBUFFER]=Pe),!0):!1}function qe(q,Pe){let _e=E,Ie=!1;if(q){_e=_.get(Pe),_e===void 0&&(_e=[],_.set(Pe,_e));const Oe=q.textures;if(_e.length!==Oe.length||_e[0]!==i.COLOR_ATTACHMENT0){for(let Se=0,Ke=Oe.length;Se<Ke;Se++)_e[Se]=i.COLOR_ATTACHMENT0+Se;_e.length=Oe.length,Ie=!0}}else _e[0]!==i.BACK&&(_e[0]=i.BACK,Ie=!0);Ie&&i.drawBuffers(_e)}function Vt(q){return b!==q?(i.useProgram(q),b=q,!0):!1}const dt={[la]:i.FUNC_ADD,[Vw]:i.FUNC_SUBTRACT,[Gw]:i.FUNC_REVERSE_SUBTRACT};dt[jw]=i.MIN,dt[Ww]=i.MAX;const Dt={[Xw]:i.ZERO,[$w]:i.ONE,[qw]:i.SRC_COLOR,[vp]:i.SRC_ALPHA,[eb]:i.SRC_ALPHA_SATURATE,[Zw]:i.DST_COLOR,[Yw]:i.DST_ALPHA,[Kw]:i.ONE_MINUS_SRC_COLOR,[_p]:i.ONE_MINUS_SRC_ALPHA,[Jw]:i.ONE_MINUS_DST_COLOR,[Qw]:i.ONE_MINUS_DST_ALPHA,[tb]:i.CONSTANT_COLOR,[nb]:i.ONE_MINUS_CONSTANT_COLOR,[ib]:i.CONSTANT_ALPHA,[rb]:i.ONE_MINUS_CONSTANT_ALPHA};function Ct(q,Pe,_e,Ie,Oe,Se,Ke,Xe,Gt,It){if(q===Wr){M===!0&&(ne(i.BLEND),M=!1);return}if(M===!1&&(fe(i.BLEND),M=!0),q!==Hw){if(q!==S||It!==z){if((P!==la||I!==la)&&(i.blendEquation(i.FUNC_ADD),P=la,I=la),It)switch(q){case go:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Wx:i.blendFunc(i.ONE,i.ONE);break;case Xx:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case $x:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Pt("WebGLState: Invalid blending: ",q);break}else switch(q){case go:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Wx:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Xx:Pt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case $x:Pt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Pt("WebGLState: Invalid blending: ",q);break}L=null,C=null,N=null,U=null,w.set(0,0,0),D=0,S=q,z=It}return}Oe=Oe||Pe,Se=Se||_e,Ke=Ke||Ie,(Pe!==P||Oe!==I)&&(i.blendEquationSeparate(dt[Pe],dt[Oe]),P=Pe,I=Oe),(_e!==L||Ie!==C||Se!==N||Ke!==U)&&(i.blendFuncSeparate(Dt[_e],Dt[Ie],Dt[Se],Dt[Ke]),L=_e,C=Ie,N=Se,U=Ke),(Xe.equals(w)===!1||Gt!==D)&&(i.blendColor(Xe.r,Xe.g,Xe.b,Gt),w.copy(Xe),D=Gt),S=q,z=!1}function Et(q,Pe){q.side===hr?ne(i.CULL_FACE):fe(i.CULL_FACE);let _e=q.side===hi;Pe&&(_e=!_e),Zt(_e),q.blending===go&&q.transparent===!1?Ct(Wr):Ct(q.blending,q.blendEquation,q.blendSrc,q.blendDst,q.blendEquationAlpha,q.blendSrcAlpha,q.blendDstAlpha,q.blendColor,q.blendAlpha,q.premultipliedAlpha),c.setFunc(q.depthFunc),c.setTest(q.depthTest),c.setMask(q.depthWrite),l.setMask(q.colorWrite);const Ie=q.stencilWrite;d.setTest(Ie),Ie&&(d.setMask(q.stencilWriteMask),d.setFunc(q.stencilFunc,q.stencilRef,q.stencilFuncMask),d.setOp(q.stencilFail,q.stencilZFail,q.stencilZPass)),sn(q.polygonOffset,q.polygonOffsetFactor,q.polygonOffsetUnits),q.alphaToCoverage===!0?fe(i.SAMPLE_ALPHA_TO_COVERAGE):ne(i.SAMPLE_ALPHA_TO_COVERAGE)}function Zt(q){H!==q&&(q?i.frontFace(i.CW):i.frontFace(i.CCW),H=q)}function un(q){q!==kw?(fe(i.CULL_FACE),q!==X&&(q===jx?i.cullFace(i.BACK):q===zw?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):ne(i.CULL_FACE),X=q}function dn(q){q!==j&&(J&&i.lineWidth(q),j=q)}function sn(q,Pe,_e){q?(fe(i.POLYGON_OFFSET_FILL),(le!==Pe||$!==_e)&&(le=Pe,$=_e,c.getReversed()&&(Pe=-Pe),i.polygonOffset(Pe,_e))):ne(i.POLYGON_OFFSET_FILL)}function Ot(q){q?fe(i.SCISSOR_TEST):ne(i.SCISSOR_TEST)}function Jt(q){q===void 0&&(q=i.TEXTURE0+ue-1),de!==q&&(i.activeTexture(q),de=q)}function Q(q,Pe,_e){_e===void 0&&(de===null?_e=i.TEXTURE0+ue-1:_e=de);let Ie=F[_e];Ie===void 0&&(Ie={type:void 0,texture:void 0},F[_e]=Ie),(Ie.type!==q||Ie.texture!==Pe)&&(de!==_e&&(i.activeTexture(_e),de=_e),i.bindTexture(q,Pe||xe[q]),Ie.type=q,Ie.texture=Pe)}function Pn(){const q=F[de];q!==void 0&&q.type!==void 0&&(i.bindTexture(q.type,null),q.type=void 0,q.texture=void 0)}function Nt(){try{i.compressedTexImage2D(...arguments)}catch(q){Pt("WebGLState:",q)}}function O(){try{i.compressedTexImage3D(...arguments)}catch(q){Pt("WebGLState:",q)}}function T(){try{i.texSubImage2D(...arguments)}catch(q){Pt("WebGLState:",q)}}function ie(){try{i.texSubImage3D(...arguments)}catch(q){Pt("WebGLState:",q)}}function he(){try{i.compressedTexSubImage2D(...arguments)}catch(q){Pt("WebGLState:",q)}}function ge(){try{i.compressedTexSubImage3D(...arguments)}catch(q){Pt("WebGLState:",q)}}function be(){try{i.texStorage2D(...arguments)}catch(q){Pt("WebGLState:",q)}}function De(){try{i.texStorage3D(...arguments)}catch(q){Pt("WebGLState:",q)}}function ve(){try{i.texImage2D(...arguments)}catch(q){Pt("WebGLState:",q)}}function ye(){try{i.texImage3D(...arguments)}catch(q){Pt("WebGLState:",q)}}function Ue(q){return p[q]!==void 0?p[q]:i.getParameter(q)}function Ze(q,Pe){p[q]!==Pe&&(i.pixelStorei(q,Pe),p[q]=Pe)}function Fe(q){Ve.equals(q)===!1&&(i.scissor(q.x,q.y,q.z,q.w),Ve.copy(q))}function Ne(q){Ge.equals(q)===!1&&(i.viewport(q.x,q.y,q.z,q.w),Ge.copy(q))}function nt(q,Pe){let _e=f.get(Pe);_e===void 0&&(_e=new WeakMap,f.set(Pe,_e));let Ie=_e.get(q);Ie===void 0&&(Ie=i.getUniformBlockIndex(Pe,q.name),_e.set(q,Ie))}function rt(q,Pe){const Ie=f.get(Pe).get(q);h.get(Pe)!==Ie&&(i.uniformBlockBinding(Pe,Ie,q.__bindingPointIndex),h.set(Pe,Ie))}function lt(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),c.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),g={},p={},de=null,F={},v={},_=new WeakMap,E=[],b=null,M=!1,S=null,P=null,L=null,C=null,I=null,N=null,U=null,w=new gt(0,0,0),D=0,z=!1,H=null,X=null,j=null,le=null,$=null,Ve.set(0,0,i.canvas.width,i.canvas.height),Ge.set(0,0,i.canvas.width,i.canvas.height),l.reset(),c.reset(),d.reset()}return{buffers:{color:l,depth:c,stencil:d},enable:fe,disable:ne,bindFramebuffer:Le,drawBuffers:qe,useProgram:Vt,setBlending:Ct,setMaterial:Et,setFlipSided:Zt,setCullFace:un,setLineWidth:dn,setPolygonOffset:sn,setScissorTest:Ot,activeTexture:Jt,bindTexture:Q,unbindTexture:Pn,compressedTexImage2D:Nt,compressedTexImage3D:O,texImage2D:ve,texImage3D:ye,pixelStorei:Ze,getParameter:Ue,updateUBOMapping:nt,uniformBlockBinding:rt,texStorage2D:be,texStorage3D:De,texSubImage2D:T,texSubImage3D:ie,compressedTexSubImage2D:he,compressedTexSubImage3D:ge,scissor:Fe,viewport:Ne,reset:lt}}function Z2(i,e,t,r,a,l,c){const d=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,h=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),f=new ut,g=new WeakMap,p=new Set;let v;const _=new WeakMap;let E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function b(O,T){return E?new OffscreenCanvas(O,T):ql("canvas")}function M(O,T,ie){let he=1;const ge=Nt(O);if((ge.width>ie||ge.height>ie)&&(he=ie/Math.max(ge.width,ge.height)),he<1)if(typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&O instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&O instanceof ImageBitmap||typeof VideoFrame<"u"&&O instanceof VideoFrame){const be=Math.floor(he*ge.width),De=Math.floor(he*ge.height);v===void 0&&(v=b(be,De));const ve=T?b(be,De):v;return ve.width=be,ve.height=De,ve.getContext("2d").drawImage(O,0,0,be,De),ot("WebGLRenderer: Texture has been resized from ("+ge.width+"x"+ge.height+") to ("+be+"x"+De+")."),ve}else return"data"in O&&ot("WebGLRenderer: Image in DataTexture is too big ("+ge.width+"x"+ge.height+")."),O;return O}function S(O){return O.generateMipmaps}function P(O){i.generateMipmap(O)}function L(O){return O.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:O.isWebGL3DRenderTarget?i.TEXTURE_3D:O.isWebGLArrayRenderTarget||O.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function C(O,T,ie,he,ge,be=!1){if(O!==null){if(i[O]!==void 0)return i[O];ot("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+O+"'")}let De;he&&(De=e.get("EXT_texture_norm16"),De||ot("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let ve=T;if(T===i.RED&&(ie===i.FLOAT&&(ve=i.R32F),ie===i.HALF_FLOAT&&(ve=i.R16F),ie===i.UNSIGNED_BYTE&&(ve=i.R8),ie===i.UNSIGNED_SHORT&&De&&(ve=De.R16_EXT),ie===i.SHORT&&De&&(ve=De.R16_SNORM_EXT)),T===i.RED_INTEGER&&(ie===i.UNSIGNED_BYTE&&(ve=i.R8UI),ie===i.UNSIGNED_SHORT&&(ve=i.R16UI),ie===i.UNSIGNED_INT&&(ve=i.R32UI),ie===i.BYTE&&(ve=i.R8I),ie===i.SHORT&&(ve=i.R16I),ie===i.INT&&(ve=i.R32I)),T===i.RG&&(ie===i.FLOAT&&(ve=i.RG32F),ie===i.HALF_FLOAT&&(ve=i.RG16F),ie===i.UNSIGNED_BYTE&&(ve=i.RG8),ie===i.UNSIGNED_SHORT&&De&&(ve=De.RG16_EXT),ie===i.SHORT&&De&&(ve=De.RG16_SNORM_EXT)),T===i.RG_INTEGER&&(ie===i.UNSIGNED_BYTE&&(ve=i.RG8UI),ie===i.UNSIGNED_SHORT&&(ve=i.RG16UI),ie===i.UNSIGNED_INT&&(ve=i.RG32UI),ie===i.BYTE&&(ve=i.RG8I),ie===i.SHORT&&(ve=i.RG16I),ie===i.INT&&(ve=i.RG32I)),T===i.RGB_INTEGER&&(ie===i.UNSIGNED_BYTE&&(ve=i.RGB8UI),ie===i.UNSIGNED_SHORT&&(ve=i.RGB16UI),ie===i.UNSIGNED_INT&&(ve=i.RGB32UI),ie===i.BYTE&&(ve=i.RGB8I),ie===i.SHORT&&(ve=i.RGB16I),ie===i.INT&&(ve=i.RGB32I)),T===i.RGBA_INTEGER&&(ie===i.UNSIGNED_BYTE&&(ve=i.RGBA8UI),ie===i.UNSIGNED_SHORT&&(ve=i.RGBA16UI),ie===i.UNSIGNED_INT&&(ve=i.RGBA32UI),ie===i.BYTE&&(ve=i.RGBA8I),ie===i.SHORT&&(ve=i.RGBA16I),ie===i.INT&&(ve=i.RGBA32I)),T===i.RGB&&(ie===i.UNSIGNED_SHORT&&De&&(ve=De.RGB16_EXT),ie===i.SHORT&&De&&(ve=De.RGB16_SNORM_EXT),ie===i.UNSIGNED_INT_5_9_9_9_REV&&(ve=i.RGB9_E5),ie===i.UNSIGNED_INT_10F_11F_11F_REV&&(ve=i.R11F_G11F_B10F)),T===i.RGBA){const ye=be?ld:Tt.getTransfer(ge);ie===i.FLOAT&&(ve=i.RGBA32F),ie===i.HALF_FLOAT&&(ve=i.RGBA16F),ie===i.UNSIGNED_BYTE&&(ve=ye===Bt?i.SRGB8_ALPHA8:i.RGBA8),ie===i.UNSIGNED_SHORT&&De&&(ve=De.RGBA16_EXT),ie===i.SHORT&&De&&(ve=De.RGBA16_SNORM_EXT),ie===i.UNSIGNED_SHORT_4_4_4_4&&(ve=i.RGBA4),ie===i.UNSIGNED_SHORT_5_5_5_1&&(ve=i.RGB5_A1)}return(ve===i.R16F||ve===i.R32F||ve===i.RG16F||ve===i.RG32F||ve===i.RGBA16F||ve===i.RGBA32F)&&e.get("EXT_color_buffer_float"),ve}function I(O,T){let ie;return O?T===null||T===yr||T===Xl?ie=i.DEPTH24_STENCIL8:T===pr?ie=i.DEPTH32F_STENCIL8:T===Wl&&(ie=i.DEPTH24_STENCIL8,ot("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):T===null||T===yr||T===Xl?ie=i.DEPTH_COMPONENT24:T===pr?ie=i.DEPTH_COMPONENT32F:T===Wl&&(ie=i.DEPTH_COMPONENT16),ie}function N(O,T){return S(O)===!0||O.isFramebufferTexture&&O.minFilter!==Un&&O.minFilter!==jn?Math.log2(Math.max(T.width,T.height))+1:O.mipmaps!==void 0&&O.mipmaps.length>0?O.mipmaps.length:O.isCompressedTexture&&Array.isArray(O.image)?T.mipmaps.length:1}function U(O){const T=O.target;T.removeEventListener("dispose",U),D(T),T.isVideoTexture&&g.delete(T),T.isHTMLTexture&&p.delete(T)}function w(O){const T=O.target;T.removeEventListener("dispose",w),H(T)}function D(O){const T=r.get(O);if(T.__webglInit===void 0)return;const ie=O.source,he=_.get(ie);if(he){const ge=he[T.__cacheKey];ge.usedTimes--,ge.usedTimes===0&&z(O),Object.keys(he).length===0&&_.delete(ie)}r.remove(O)}function z(O){const T=r.get(O);i.deleteTexture(T.__webglTexture);const ie=O.source,he=_.get(ie);delete he[T.__cacheKey],c.memory.textures--}function H(O){const T=r.get(O);if(O.depthTexture&&(O.depthTexture.dispose(),r.remove(O.depthTexture)),O.isWebGLCubeRenderTarget)for(let he=0;he<6;he++){if(Array.isArray(T.__webglFramebuffer[he]))for(let ge=0;ge<T.__webglFramebuffer[he].length;ge++)i.deleteFramebuffer(T.__webglFramebuffer[he][ge]);else i.deleteFramebuffer(T.__webglFramebuffer[he]);T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer[he])}else{if(Array.isArray(T.__webglFramebuffer))for(let he=0;he<T.__webglFramebuffer.length;he++)i.deleteFramebuffer(T.__webglFramebuffer[he]);else i.deleteFramebuffer(T.__webglFramebuffer);if(T.__webglDepthbuffer&&i.deleteRenderbuffer(T.__webglDepthbuffer),T.__webglMultisampledFramebuffer&&i.deleteFramebuffer(T.__webglMultisampledFramebuffer),T.__webglColorRenderbuffer)for(let he=0;he<T.__webglColorRenderbuffer.length;he++)T.__webglColorRenderbuffer[he]&&i.deleteRenderbuffer(T.__webglColorRenderbuffer[he]);T.__webglDepthRenderbuffer&&i.deleteRenderbuffer(T.__webglDepthRenderbuffer)}const ie=O.textures;for(let he=0,ge=ie.length;he<ge;he++){const be=r.get(ie[he]);be.__webglTexture&&(i.deleteTexture(be.__webglTexture),c.memory.textures--),r.remove(ie[he])}r.remove(O)}let X=0;function j(){X=0}function le(){return X}function $(O){X=O}function ue(){const O=X;return O>=a.maxTextures&&ot("WebGLTextures: Trying to use "+O+" texture units while this GPU supports only "+a.maxTextures),X+=1,O}function J(O){const T=[];return T.push(O.wrapS),T.push(O.wrapT),T.push(O.wrapR||0),T.push(O.magFilter),T.push(O.minFilter),T.push(O.anisotropy),T.push(O.internalFormat),T.push(O.format),T.push(O.type),T.push(O.generateMipmaps),T.push(O.premultiplyAlpha),T.push(O.flipY),T.push(O.unpackAlignment),T.push(O.colorSpace),T.join()}function K(O,T){const ie=r.get(O);if(O.isVideoTexture&&Q(O),O.isRenderTargetTexture===!1&&O.isExternalTexture!==!0&&O.version>0&&ie.__version!==O.version){const he=O.image;if(he===null)ot("WebGLRenderer: Texture marked for update but no image data found.");else if(he.complete===!1)ot("WebGLRenderer: Texture marked for update but image is incomplete");else{ne(ie,O,T);return}}else O.isExternalTexture&&(ie.__webglTexture=O.sourceTexture?O.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,ie.__webglTexture,i.TEXTURE0+T)}function re(O,T){const ie=r.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&ie.__version!==O.version){ne(ie,O,T);return}else O.isExternalTexture&&(ie.__webglTexture=O.sourceTexture?O.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,ie.__webglTexture,i.TEXTURE0+T)}function de(O,T){const ie=r.get(O);if(O.isRenderTargetTexture===!1&&O.version>0&&ie.__version!==O.version){ne(ie,O,T);return}t.bindTexture(i.TEXTURE_3D,ie.__webglTexture,i.TEXTURE0+T)}function F(O,T){const ie=r.get(O);if(O.isCubeDepthTexture!==!0&&O.version>0&&ie.__version!==O.version){Le(ie,O,T);return}t.bindTexture(i.TEXTURE_CUBE_MAP,ie.__webglTexture,i.TEXTURE0+T)}const ee={[Cp]:i.REPEAT,[jr]:i.CLAMP_TO_EDGE,[Rp]:i.MIRRORED_REPEAT},Ce={[Un]:i.NEAREST,[ob]:i.NEAREST_MIPMAP_NEAREST,[pu]:i.NEAREST_MIPMAP_LINEAR,[jn]:i.LINEAR,[gf]:i.LINEAR_MIPMAP_NEAREST,[da]:i.LINEAR_MIPMAP_LINEAR},Ve={[ub]:i.NEVER,[mb]:i.ALWAYS,[db]:i.LESS,[Om]:i.LEQUAL,[hb]:i.EQUAL,[km]:i.GEQUAL,[fb]:i.GREATER,[pb]:i.NOTEQUAL};function Ge(O,T){if(T.type===pr&&e.has("OES_texture_float_linear")===!1&&(T.magFilter===jn||T.magFilter===gf||T.magFilter===pu||T.magFilter===da||T.minFilter===jn||T.minFilter===gf||T.minFilter===pu||T.minFilter===da)&&ot("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(O,i.TEXTURE_WRAP_S,ee[T.wrapS]),i.texParameteri(O,i.TEXTURE_WRAP_T,ee[T.wrapT]),(O===i.TEXTURE_3D||O===i.TEXTURE_2D_ARRAY)&&i.texParameteri(O,i.TEXTURE_WRAP_R,ee[T.wrapR]),i.texParameteri(O,i.TEXTURE_MAG_FILTER,Ce[T.magFilter]),i.texParameteri(O,i.TEXTURE_MIN_FILTER,Ce[T.minFilter]),T.compareFunction&&(i.texParameteri(O,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(O,i.TEXTURE_COMPARE_FUNC,Ve[T.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(T.magFilter===Un||T.minFilter!==pu&&T.minFilter!==da||T.type===pr&&e.has("OES_texture_float_linear")===!1)return;if(T.anisotropy>1||r.get(T).__currentAnisotropy){const ie=e.get("EXT_texture_filter_anisotropic");i.texParameterf(O,ie.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(T.anisotropy,a.getMaxAnisotropy())),r.get(T).__currentAnisotropy=T.anisotropy}}}function V(O,T){let ie=!1;O.__webglInit===void 0&&(O.__webglInit=!0,T.addEventListener("dispose",U));const he=T.source;let ge=_.get(he);ge===void 0&&(ge={},_.set(he,ge));const be=J(T);if(be!==O.__cacheKey){ge[be]===void 0&&(ge[be]={texture:i.createTexture(),usedTimes:0},c.memory.textures++,ie=!0),ge[be].usedTimes++;const De=ge[O.__cacheKey];De!==void 0&&(ge[O.__cacheKey].usedTimes--,De.usedTimes===0&&z(T)),O.__cacheKey=be,O.__webglTexture=ge[be].texture}return ie}function xe(O,T,ie){return Math.floor(Math.floor(O/ie)/T)}function fe(O,T,ie,he){const be=O.updateRanges;if(be.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,T.width,T.height,ie,he,T.data);else{be.sort((Ze,Fe)=>Ze.start-Fe.start);let De=0;for(let Ze=1;Ze<be.length;Ze++){const Fe=be[De],Ne=be[Ze],nt=Fe.start+Fe.count,rt=xe(Ne.start,T.width,4),lt=xe(Fe.start,T.width,4);Ne.start<=nt+1&&rt===lt&&xe(Ne.start+Ne.count-1,T.width,4)===rt?Fe.count=Math.max(Fe.count,Ne.start+Ne.count-Fe.start):(++De,be[De]=Ne)}be.length=De+1;const ve=t.getParameter(i.UNPACK_ROW_LENGTH),ye=t.getParameter(i.UNPACK_SKIP_PIXELS),Ue=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,T.width);for(let Ze=0,Fe=be.length;Ze<Fe;Ze++){const Ne=be[Ze],nt=Math.floor(Ne.start/4),rt=Math.ceil(Ne.count/4),lt=nt%T.width,q=Math.floor(nt/T.width),Pe=rt,_e=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,lt),t.pixelStorei(i.UNPACK_SKIP_ROWS,q),t.texSubImage2D(i.TEXTURE_2D,0,lt,q,Pe,_e,ie,he,T.data)}O.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,ve),t.pixelStorei(i.UNPACK_SKIP_PIXELS,ye),t.pixelStorei(i.UNPACK_SKIP_ROWS,Ue)}}function ne(O,T,ie){let he=i.TEXTURE_2D;(T.isDataArrayTexture||T.isCompressedArrayTexture)&&(he=i.TEXTURE_2D_ARRAY),T.isData3DTexture&&(he=i.TEXTURE_3D);const ge=V(O,T),be=T.source;t.bindTexture(he,O.__webglTexture,i.TEXTURE0+ie);const De=r.get(be);if(be.version!==De.__version||ge===!0){if(t.activeTexture(i.TEXTURE0+ie),(typeof ImageBitmap<"u"&&T.image instanceof ImageBitmap)===!1){const _e=Tt.getPrimaries(Tt.workingColorSpace),Ie=T.colorSpace===bs?null:Tt.getPrimaries(T.colorSpace),Oe=T.colorSpace===bs||_e===Ie?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Oe)}t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment);let ye=M(T.image,!1,a.maxTextureSize);ye=Pn(T,ye);const Ue=l.convert(T.format,T.colorSpace),Ze=l.convert(T.type);let Fe=C(T.internalFormat,Ue,Ze,T.normalized,T.colorSpace,T.isVideoTexture);Ge(he,T);let Ne;const nt=T.mipmaps,rt=T.isVideoTexture!==!0,lt=De.__version===void 0||ge===!0,q=be.dataReady,Pe=N(T,ye);if(T.isDepthTexture)Fe=I(T.format===ha,T.type),lt&&(rt?t.texStorage2D(i.TEXTURE_2D,1,Fe,ye.width,ye.height):t.texImage2D(i.TEXTURE_2D,0,Fe,ye.width,ye.height,0,Ue,Ze,null));else if(T.isDataTexture)if(nt.length>0){rt&&lt&&t.texStorage2D(i.TEXTURE_2D,Pe,Fe,nt[0].width,nt[0].height);for(let _e=0,Ie=nt.length;_e<Ie;_e++)Ne=nt[_e],rt?q&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Ne.width,Ne.height,Ue,Ze,Ne.data):t.texImage2D(i.TEXTURE_2D,_e,Fe,Ne.width,Ne.height,0,Ue,Ze,Ne.data);T.generateMipmaps=!1}else rt?(lt&&t.texStorage2D(i.TEXTURE_2D,Pe,Fe,ye.width,ye.height),q&&fe(T,ye,Ue,Ze)):t.texImage2D(i.TEXTURE_2D,0,Fe,ye.width,ye.height,0,Ue,Ze,ye.data);else if(T.isCompressedTexture)if(T.isCompressedArrayTexture){rt&&lt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,Fe,nt[0].width,nt[0].height,ye.depth);for(let _e=0,Ie=nt.length;_e<Ie;_e++)if(Ne=nt[_e],T.format!==Ki)if(Ue!==null)if(rt){if(q)if(T.layerUpdates.size>0){const Oe=Rv(Ne.width,Ne.height,T.format,T.type);for(const Se of T.layerUpdates){const Ke=Ne.data.subarray(Se*Oe/Ne.data.BYTES_PER_ELEMENT,(Se+1)*Oe/Ne.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,Se,Ne.width,Ne.height,1,Ue,Ke)}T.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Ne.width,Ne.height,ye.depth,Ue,Ne.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,_e,Fe,Ne.width,Ne.height,ye.depth,0,Ne.data,0,0);else ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else rt?q&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,_e,0,0,0,Ne.width,Ne.height,ye.depth,Ue,Ze,Ne.data):t.texImage3D(i.TEXTURE_2D_ARRAY,_e,Fe,Ne.width,Ne.height,ye.depth,0,Ue,Ze,Ne.data)}else{rt&&lt&&t.texStorage2D(i.TEXTURE_2D,Pe,Fe,nt[0].width,nt[0].height);for(let _e=0,Ie=nt.length;_e<Ie;_e++)Ne=nt[_e],T.format!==Ki?Ue!==null?rt?q&&t.compressedTexSubImage2D(i.TEXTURE_2D,_e,0,0,Ne.width,Ne.height,Ue,Ne.data):t.compressedTexImage2D(i.TEXTURE_2D,_e,Fe,Ne.width,Ne.height,0,Ne.data):ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):rt?q&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Ne.width,Ne.height,Ue,Ze,Ne.data):t.texImage2D(i.TEXTURE_2D,_e,Fe,Ne.width,Ne.height,0,Ue,Ze,Ne.data)}else if(T.isDataArrayTexture)if(rt){if(lt&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Pe,Fe,ye.width,ye.height,ye.depth),q)if(T.layerUpdates.size>0){const _e=Rv(ye.width,ye.height,T.format,T.type);for(const Ie of T.layerUpdates){const Oe=ye.data.subarray(Ie*_e/ye.data.BYTES_PER_ELEMENT,(Ie+1)*_e/ye.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Ie,ye.width,ye.height,1,Ue,Ze,Oe)}T.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,ye.width,ye.height,ye.depth,Ue,Ze,ye.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,Fe,ye.width,ye.height,ye.depth,0,Ue,Ze,ye.data);else if(T.isData3DTexture)rt?(lt&&t.texStorage3D(i.TEXTURE_3D,Pe,Fe,ye.width,ye.height,ye.depth),q&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,ye.width,ye.height,ye.depth,Ue,Ze,ye.data)):t.texImage3D(i.TEXTURE_3D,0,Fe,ye.width,ye.height,ye.depth,0,Ue,Ze,ye.data);else if(T.isFramebufferTexture){if(lt)if(rt)t.texStorage2D(i.TEXTURE_2D,Pe,Fe,ye.width,ye.height);else{let _e=ye.width,Ie=ye.height;for(let Oe=0;Oe<Pe;Oe++)t.texImage2D(i.TEXTURE_2D,Oe,Fe,_e,Ie,0,Ue,Ze,null),_e>>=1,Ie>>=1}}else if(T.isHTMLTexture){if("texElementImage2D"in i){const _e=i.canvas;if(_e.hasAttribute("layoutsubtree")||_e.setAttribute("layoutsubtree","true"),ye.parentNode!==_e){_e.appendChild(ye),p.add(T),_e.onpaint=Ie=>{const Oe=Ie.changedElements;for(const Se of p)Oe.includes(Se.image)&&(Se.needsUpdate=!0)},_e.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,ye);else{const Oe=i.RGBA,Se=i.RGBA,Ke=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,Oe,Se,Ke,ye)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(nt.length>0){if(rt&&lt){const _e=Nt(nt[0]);t.texStorage2D(i.TEXTURE_2D,Pe,Fe,_e.width,_e.height)}for(let _e=0,Ie=nt.length;_e<Ie;_e++)Ne=nt[_e],rt?q&&t.texSubImage2D(i.TEXTURE_2D,_e,0,0,Ue,Ze,Ne):t.texImage2D(i.TEXTURE_2D,_e,Fe,Ue,Ze,Ne);T.generateMipmaps=!1}else if(rt){if(lt){const _e=Nt(ye);t.texStorage2D(i.TEXTURE_2D,Pe,Fe,_e.width,_e.height)}q&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,Ue,Ze,ye)}else t.texImage2D(i.TEXTURE_2D,0,Fe,Ue,Ze,ye);S(T)&&P(he),De.__version=be.version,T.onUpdate&&T.onUpdate(T)}O.__version=T.version}function Le(O,T,ie){if(T.image.length!==6)return;const he=V(O,T),ge=T.source;t.bindTexture(i.TEXTURE_CUBE_MAP,O.__webglTexture,i.TEXTURE0+ie);const be=r.get(ge);if(ge.version!==be.__version||he===!0){t.activeTexture(i.TEXTURE0+ie);const De=Tt.getPrimaries(Tt.workingColorSpace),ve=T.colorSpace===bs?null:Tt.getPrimaries(T.colorSpace),ye=T.colorSpace===bs||De===ve?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,T.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,T.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,T.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ye);const Ue=T.isCompressedTexture||T.image[0].isCompressedTexture,Ze=T.image[0]&&T.image[0].isDataTexture,Fe=[];for(let Se=0;Se<6;Se++)!Ue&&!Ze?Fe[Se]=M(T.image[Se],!0,a.maxCubemapSize):Fe[Se]=Ze?T.image[Se].image:T.image[Se],Fe[Se]=Pn(T,Fe[Se]);const Ne=Fe[0],nt=l.convert(T.format,T.colorSpace),rt=l.convert(T.type),lt=C(T.internalFormat,nt,rt,T.normalized,T.colorSpace),q=T.isVideoTexture!==!0,Pe=be.__version===void 0||he===!0,_e=ge.dataReady;let Ie=N(T,Ne);Ge(i.TEXTURE_CUBE_MAP,T);let Oe;if(Ue){q&&Pe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Ie,lt,Ne.width,Ne.height);for(let Se=0;Se<6;Se++){Oe=Fe[Se].mipmaps;for(let Ke=0;Ke<Oe.length;Ke++){const Xe=Oe[Ke];T.format!==Ki?nt!==null?q?_e&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,0,0,Xe.width,Xe.height,nt,Xe.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,lt,Xe.width,Xe.height,0,Xe.data):ot("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):q?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,0,0,Xe.width,Xe.height,nt,rt,Xe.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke,lt,Xe.width,Xe.height,0,nt,rt,Xe.data)}}}else{if(Oe=T.mipmaps,q&&Pe){Oe.length>0&&Ie++;const Se=Nt(Fe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Ie,lt,Se.width,Se.height)}for(let Se=0;Se<6;Se++)if(Ze){q?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,0,0,Fe[Se].width,Fe[Se].height,nt,rt,Fe[Se].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,lt,Fe[Se].width,Fe[Se].height,0,nt,rt,Fe[Se].data);for(let Ke=0;Ke<Oe.length;Ke++){const Gt=Oe[Ke].image[Se].image;q?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,0,0,Gt.width,Gt.height,nt,rt,Gt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,lt,Gt.width,Gt.height,0,nt,rt,Gt.data)}}else{q?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,0,0,nt,rt,Fe[Se]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,0,lt,nt,rt,Fe[Se]);for(let Ke=0;Ke<Oe.length;Ke++){const Xe=Oe[Ke];q?_e&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,0,0,nt,rt,Xe.image[Se]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Se,Ke+1,lt,nt,rt,Xe.image[Se])}}}S(T)&&P(i.TEXTURE_CUBE_MAP),be.__version=ge.version,T.onUpdate&&T.onUpdate(T)}O.__version=T.version}function qe(O,T,ie,he,ge,be){const De=l.convert(ie.format,ie.colorSpace),ve=l.convert(ie.type),ye=C(ie.internalFormat,De,ve,ie.normalized,ie.colorSpace),Ue=r.get(T),Ze=r.get(ie);if(Ze.__renderTarget=T,!Ue.__hasExternalTextures){const Fe=Math.max(1,T.width>>be),Ne=Math.max(1,T.height>>be);ge===i.TEXTURE_3D||ge===i.TEXTURE_2D_ARRAY?t.texImage3D(ge,be,ye,Fe,Ne,T.depth,0,De,ve,null):t.texImage2D(ge,be,ye,Fe,Ne,0,De,ve,null)}t.bindFramebuffer(i.FRAMEBUFFER,O),Jt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,he,ge,Ze.__webglTexture,0,Ot(T)):(ge===i.TEXTURE_2D||ge>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&ge<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,he,ge,Ze.__webglTexture,be),t.bindFramebuffer(i.FRAMEBUFFER,null)}function Vt(O,T,ie){if(i.bindRenderbuffer(i.RENDERBUFFER,O),T.depthBuffer){const he=T.depthTexture,ge=he&&he.isDepthTexture?he.type:null,be=I(T.stencilBuffer,ge),De=T.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Jt(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ot(T),be,T.width,T.height):ie?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ot(T),be,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,be,T.width,T.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,De,i.RENDERBUFFER,O)}else{const he=T.textures;for(let ge=0;ge<he.length;ge++){const be=he[ge],De=l.convert(be.format,be.colorSpace),ve=l.convert(be.type),ye=C(be.internalFormat,De,ve,be.normalized,be.colorSpace);Jt(T)?d.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,Ot(T),ye,T.width,T.height):ie?i.renderbufferStorageMultisample(i.RENDERBUFFER,Ot(T),ye,T.width,T.height):i.renderbufferStorage(i.RENDERBUFFER,ye,T.width,T.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function dt(O,T,ie){const he=T.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,O),!(T.depthTexture&&T.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const ge=r.get(T.depthTexture);if(ge.__renderTarget=T,(!ge.__webglTexture||T.depthTexture.image.width!==T.width||T.depthTexture.image.height!==T.height)&&(T.depthTexture.image.width=T.width,T.depthTexture.image.height=T.height,T.depthTexture.needsUpdate=!0),he){if(ge.__webglInit===void 0&&(ge.__webglInit=!0,T.depthTexture.addEventListener("dispose",U)),ge.__webglTexture===void 0){ge.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,ge.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,T.depthTexture);const Ue=l.convert(T.depthTexture.format),Ze=l.convert(T.depthTexture.type);let Fe;T.depthTexture.format===Yr?Fe=i.DEPTH_COMPONENT24:T.depthTexture.format===ha&&(Fe=i.DEPTH24_STENCIL8);for(let Ne=0;Ne<6;Ne++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Ne,0,Fe,T.width,T.height,0,Ue,Ze,null)}}else K(T.depthTexture,0);const be=ge.__webglTexture,De=Ot(T),ve=he?i.TEXTURE_CUBE_MAP_POSITIVE_X+ie:i.TEXTURE_2D,ye=T.depthTexture.format===ha?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(T.depthTexture.format===Yr)Jt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ye,ve,be,0,De):i.framebufferTexture2D(i.FRAMEBUFFER,ye,ve,be,0);else if(T.depthTexture.format===ha)Jt(T)?d.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ye,ve,be,0,De):i.framebufferTexture2D(i.FRAMEBUFFER,ye,ve,be,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Dt(O){const T=r.get(O),ie=O.isWebGLCubeRenderTarget===!0;if(T.__boundDepthTexture!==O.depthTexture){const he=O.depthTexture;if(T.__depthDisposeCallback&&T.__depthDisposeCallback(),he){const ge=()=>{delete T.__boundDepthTexture,delete T.__depthDisposeCallback,he.removeEventListener("dispose",ge)};he.addEventListener("dispose",ge),T.__depthDisposeCallback=ge}T.__boundDepthTexture=he}if(O.depthTexture&&!T.__autoAllocateDepthBuffer)if(ie)for(let he=0;he<6;he++)dt(T.__webglFramebuffer[he],O,he);else{const he=O.texture.mipmaps;he&&he.length>0?dt(T.__webglFramebuffer[0],O,0):dt(T.__webglFramebuffer,O,0)}else if(ie){T.__webglDepthbuffer=[];for(let he=0;he<6;he++)if(t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[he]),T.__webglDepthbuffer[he]===void 0)T.__webglDepthbuffer[he]=i.createRenderbuffer(),Vt(T.__webglDepthbuffer[he],O,!1);else{const ge=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,be=T.__webglDepthbuffer[he];i.bindRenderbuffer(i.RENDERBUFFER,be),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,be)}}else{const he=O.texture.mipmaps;if(he&&he.length>0?t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,T.__webglFramebuffer),T.__webglDepthbuffer===void 0)T.__webglDepthbuffer=i.createRenderbuffer(),Vt(T.__webglDepthbuffer,O,!1);else{const ge=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,be=T.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,be),i.framebufferRenderbuffer(i.FRAMEBUFFER,ge,i.RENDERBUFFER,be)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Ct(O,T,ie){const he=r.get(O);T!==void 0&&qe(he.__webglFramebuffer,O,O.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),ie!==void 0&&Dt(O)}function Et(O){const T=O.texture,ie=r.get(O),he=r.get(T);O.addEventListener("dispose",w);const ge=O.textures,be=O.isWebGLCubeRenderTarget===!0,De=ge.length>1;if(De||(he.__webglTexture===void 0&&(he.__webglTexture=i.createTexture()),he.__version=T.version,c.memory.textures++),be){ie.__webglFramebuffer=[];for(let ve=0;ve<6;ve++)if(T.mipmaps&&T.mipmaps.length>0){ie.__webglFramebuffer[ve]=[];for(let ye=0;ye<T.mipmaps.length;ye++)ie.__webglFramebuffer[ve][ye]=i.createFramebuffer()}else ie.__webglFramebuffer[ve]=i.createFramebuffer()}else{if(T.mipmaps&&T.mipmaps.length>0){ie.__webglFramebuffer=[];for(let ve=0;ve<T.mipmaps.length;ve++)ie.__webglFramebuffer[ve]=i.createFramebuffer()}else ie.__webglFramebuffer=i.createFramebuffer();if(De)for(let ve=0,ye=ge.length;ve<ye;ve++){const Ue=r.get(ge[ve]);Ue.__webglTexture===void 0&&(Ue.__webglTexture=i.createTexture(),c.memory.textures++)}if(O.samples>0&&Jt(O)===!1){ie.__webglMultisampledFramebuffer=i.createFramebuffer(),ie.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,ie.__webglMultisampledFramebuffer);for(let ve=0;ve<ge.length;ve++){const ye=ge[ve];ie.__webglColorRenderbuffer[ve]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,ie.__webglColorRenderbuffer[ve]);const Ue=l.convert(ye.format,ye.colorSpace),Ze=l.convert(ye.type),Fe=C(ye.internalFormat,Ue,Ze,ye.normalized,ye.colorSpace,O.isXRRenderTarget===!0),Ne=Ot(O);i.renderbufferStorageMultisample(i.RENDERBUFFER,Ne,Fe,O.width,O.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ve,i.RENDERBUFFER,ie.__webglColorRenderbuffer[ve])}i.bindRenderbuffer(i.RENDERBUFFER,null),O.depthBuffer&&(ie.__webglDepthRenderbuffer=i.createRenderbuffer(),Vt(ie.__webglDepthRenderbuffer,O,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(be){t.bindTexture(i.TEXTURE_CUBE_MAP,he.__webglTexture),Ge(i.TEXTURE_CUBE_MAP,T);for(let ve=0;ve<6;ve++)if(T.mipmaps&&T.mipmaps.length>0)for(let ye=0;ye<T.mipmaps.length;ye++)qe(ie.__webglFramebuffer[ve][ye],O,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,ye);else qe(ie.__webglFramebuffer[ve],O,T,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0);S(T)&&P(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(De){for(let ve=0,ye=ge.length;ve<ye;ve++){const Ue=ge[ve],Ze=r.get(Ue);let Fe=i.TEXTURE_2D;(O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(Fe=O.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Fe,Ze.__webglTexture),Ge(Fe,Ue),qe(ie.__webglFramebuffer,O,Ue,i.COLOR_ATTACHMENT0+ve,Fe,0),S(Ue)&&P(Fe)}t.unbindTexture()}else{let ve=i.TEXTURE_2D;if((O.isWebGL3DRenderTarget||O.isWebGLArrayRenderTarget)&&(ve=O.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ve,he.__webglTexture),Ge(ve,T),T.mipmaps&&T.mipmaps.length>0)for(let ye=0;ye<T.mipmaps.length;ye++)qe(ie.__webglFramebuffer[ye],O,T,i.COLOR_ATTACHMENT0,ve,ye);else qe(ie.__webglFramebuffer,O,T,i.COLOR_ATTACHMENT0,ve,0);S(T)&&P(ve),t.unbindTexture()}O.depthBuffer&&Dt(O)}function Zt(O){const T=O.textures;for(let ie=0,he=T.length;ie<he;ie++){const ge=T[ie];if(S(ge)){const be=L(O),De=r.get(ge).__webglTexture;t.bindTexture(be,De),P(be),t.unbindTexture()}}}const un=[],dn=[];function sn(O){if(O.samples>0){if(Jt(O)===!1){const T=O.textures,ie=O.width,he=O.height;let ge=i.COLOR_BUFFER_BIT;const be=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,De=r.get(O),ve=T.length>1;if(ve)for(let Ue=0;Ue<T.length;Ue++)t.bindFramebuffer(i.FRAMEBUFFER,De.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,De.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,De.__webglMultisampledFramebuffer);const ye=O.texture.mipmaps;ye&&ye.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,De.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,De.__webglFramebuffer);for(let Ue=0;Ue<T.length;Ue++){if(O.resolveDepthBuffer&&(O.depthBuffer&&(ge|=i.DEPTH_BUFFER_BIT),O.stencilBuffer&&O.resolveStencilBuffer&&(ge|=i.STENCIL_BUFFER_BIT)),ve){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,De.__webglColorRenderbuffer[Ue]);const Ze=r.get(T[Ue]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ze,0)}i.blitFramebuffer(0,0,ie,he,0,0,ie,he,ge,i.NEAREST),h===!0&&(un.length=0,dn.length=0,un.push(i.COLOR_ATTACHMENT0+Ue),O.depthBuffer&&O.resolveDepthBuffer===!1&&(un.push(be),dn.push(be),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,dn)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,un))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),ve)for(let Ue=0;Ue<T.length;Ue++){t.bindFramebuffer(i.FRAMEBUFFER,De.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.RENDERBUFFER,De.__webglColorRenderbuffer[Ue]);const Ze=r.get(T[Ue]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,De.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+Ue,i.TEXTURE_2D,Ze,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,De.__webglMultisampledFramebuffer)}else if(O.depthBuffer&&O.resolveDepthBuffer===!1&&h){const T=O.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[T])}}}function Ot(O){return Math.min(a.maxSamples,O.samples)}function Jt(O){const T=r.get(O);return O.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&T.__useRenderToTexture!==!1}function Q(O){const T=c.render.frame;g.get(O)!==T&&(g.set(O,T),O.update())}function Pn(O,T){const ie=O.colorSpace,he=O.format,ge=O.type;return O.isCompressedTexture===!0||O.isVideoTexture===!0||ie!==od&&ie!==bs&&(Tt.getTransfer(ie)===Bt?(he!==Ki||ge!==Si)&&ot("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Pt("WebGLTextures: Unsupported texture color space:",ie)),T}function Nt(O){return typeof HTMLImageElement<"u"&&O instanceof HTMLImageElement?(f.width=O.naturalWidth||O.width,f.height=O.naturalHeight||O.height):typeof VideoFrame<"u"&&O instanceof VideoFrame?(f.width=O.displayWidth,f.height=O.displayHeight):(f.width=O.width,f.height=O.height),f}this.allocateTextureUnit=ue,this.resetTextureUnits=j,this.getTextureUnits=le,this.setTextureUnits=$,this.setTexture2D=K,this.setTexture2DArray=re,this.setTexture3D=de,this.setTextureCube=F,this.rebindTextures=Ct,this.setupRenderTarget=Et,this.updateRenderTargetMipmap=Zt,this.updateMultisampleRenderTarget=sn,this.setupDepthRenderbuffer=Dt,this.setupFrameBufferTexture=qe,this.useMultisampledRTT=Jt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function J2(i,e){function t(r,a=bs){let l;const c=Tt.getTransfer(a);if(r===Si)return i.UNSIGNED_BYTE;if(r===Lm)return i.UNSIGNED_SHORT_4_4_4_4;if(r===Dm)return i.UNSIGNED_SHORT_5_5_5_1;if(r===my)return i.UNSIGNED_INT_5_9_9_9_REV;if(r===gy)return i.UNSIGNED_INT_10F_11F_11F_REV;if(r===fy)return i.BYTE;if(r===py)return i.SHORT;if(r===Wl)return i.UNSIGNED_SHORT;if(r===Nm)return i.INT;if(r===yr)return i.UNSIGNED_INT;if(r===pr)return i.FLOAT;if(r===Kr)return i.HALF_FLOAT;if(r===xy)return i.ALPHA;if(r===vy)return i.RGB;if(r===Ki)return i.RGBA;if(r===Yr)return i.DEPTH_COMPONENT;if(r===ha)return i.DEPTH_STENCIL;if(r===_y)return i.RED;if(r===Im)return i.RED_INTEGER;if(r===wa)return i.RG;if(r===Um)return i.RG_INTEGER;if(r===Fm)return i.RGBA_INTEGER;if(r===Xu||r===$u||r===qu||r===Ku)if(c===Bt)if(l=e.get("WEBGL_compressed_texture_s3tc_srgb"),l!==null){if(r===Xu)return l.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===Ku)return l.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(l=e.get("WEBGL_compressed_texture_s3tc"),l!==null){if(r===Xu)return l.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===$u)return l.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===qu)return l.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===Ku)return l.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Ap||r===Pp||r===Np||r===Lp)if(l=e.get("WEBGL_compressed_texture_pvrtc"),l!==null){if(r===Ap)return l.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===Pp)return l.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Np)return l.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Lp)return l.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===Dp||r===Ip||r===Up||r===Fp||r===Op||r===rd||r===kp)if(l=e.get("WEBGL_compressed_texture_etc"),l!==null){if(r===Dp||r===Ip)return c===Bt?l.COMPRESSED_SRGB8_ETC2:l.COMPRESSED_RGB8_ETC2;if(r===Up)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:l.COMPRESSED_RGBA8_ETC2_EAC;if(r===Fp)return l.COMPRESSED_R11_EAC;if(r===Op)return l.COMPRESSED_SIGNED_R11_EAC;if(r===rd)return l.COMPRESSED_RG11_EAC;if(r===kp)return l.COMPRESSED_SIGNED_RG11_EAC}else return null;if(r===zp||r===Bp||r===Hp||r===Vp||r===Gp||r===jp||r===Wp||r===Xp||r===$p||r===qp||r===Kp||r===Yp||r===Qp||r===Zp)if(l=e.get("WEBGL_compressed_texture_astc"),l!==null){if(r===zp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:l.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Bp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:l.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Hp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:l.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Vp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:l.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Gp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:l.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===jp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:l.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Wp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:l.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Xp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:l.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===$p)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:l.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===qp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:l.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Kp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:l.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Yp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:l.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===Qp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:l.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Zp)return c===Bt?l.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:l.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===Jp||r===em||r===tm)if(l=e.get("EXT_texture_compression_bptc"),l!==null){if(r===Jp)return c===Bt?l.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:l.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===em)return l.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===tm)return l.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===nm||r===im||r===sd||r===rm)if(l=e.get("EXT_texture_compression_rgtc"),l!==null){if(r===nm)return l.COMPRESSED_RED_RGTC1_EXT;if(r===im)return l.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===sd)return l.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===rm)return l.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===Xl?i.UNSIGNED_INT_24_8:i[r]!==void 0?i[r]:null}return{convert:t}}const eP=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,tP=`
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

}`;class nP{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const r=new Ry(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=r}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,r=new Mr({vertexShader:eP,fragmentShader:tP,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Qi(new Sd(20,20),r)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class iP extends zs{constructor(e,t){super();const r=this;let a=null,l=1,c=null,d="local-floor",h=1,f=null,g=null,p=null,v=null,_=null,E=null;const b=typeof XRWebGLBinding<"u",M=new nP,S={},P=t.getContextAttributes();let L=null,C=null;const I=[],N=[],U=new ut;let w=null;const D=new Ii;D.viewport=new cn;const z=new Ii;z.viewport=new cn;const H=[D,z],X=new hT;let j=null,le=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(V){let xe=I[V];return xe===void 0&&(xe=new Ef,I[V]=xe),xe.getTargetRaySpace()},this.getControllerGrip=function(V){let xe=I[V];return xe===void 0&&(xe=new Ef,I[V]=xe),xe.getGripSpace()},this.getHand=function(V){let xe=I[V];return xe===void 0&&(xe=new Ef,I[V]=xe),xe.getHandSpace()};function $(V){const xe=N.indexOf(V.inputSource);if(xe===-1)return;const fe=I[xe];fe!==void 0&&(fe.update(V.inputSource,V.frame,f||c),fe.dispatchEvent({type:V.type,data:V.inputSource}))}function ue(){a.removeEventListener("select",$),a.removeEventListener("selectstart",$),a.removeEventListener("selectend",$),a.removeEventListener("squeeze",$),a.removeEventListener("squeezestart",$),a.removeEventListener("squeezeend",$),a.removeEventListener("end",ue),a.removeEventListener("inputsourceschange",J);for(let V=0;V<I.length;V++){const xe=N[V];xe!==null&&(N[V]=null,I[V].disconnect(xe))}j=null,le=null,M.reset();for(const V in S)delete S[V];e.setRenderTarget(L),_=null,v=null,p=null,a=null,C=null,Ge.stop(),r.isPresenting=!1,e.setPixelRatio(w),e.setSize(U.width,U.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(V){l=V,r.isPresenting===!0&&ot("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(V){d=V,r.isPresenting===!0&&ot("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return f||c},this.setReferenceSpace=function(V){f=V},this.getBaseLayer=function(){return v!==null?v:_},this.getBinding=function(){return p===null&&b&&(p=new XRWebGLBinding(a,t)),p},this.getFrame=function(){return E},this.getSession=function(){return a},this.setSession=async function(V){if(a=V,a!==null){if(L=e.getRenderTarget(),a.addEventListener("select",$),a.addEventListener("selectstart",$),a.addEventListener("selectend",$),a.addEventListener("squeeze",$),a.addEventListener("squeezestart",$),a.addEventListener("squeezeend",$),a.addEventListener("end",ue),a.addEventListener("inputsourceschange",J),P.xrCompatible!==!0&&await t.makeXRCompatible(),w=e.getPixelRatio(),e.getSize(U),b&&"createProjectionLayer"in XRWebGLBinding.prototype){let fe=null,ne=null,Le=null;P.depth&&(Le=P.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,fe=P.stencil?ha:Yr,ne=P.stencil?Xl:yr);const qe={colorFormat:t.RGBA8,depthFormat:Le,scaleFactor:l};p=this.getBinding(),v=p.createProjectionLayer(qe),a.updateRenderState({layers:[v]}),e.setPixelRatio(1),e.setSize(v.textureWidth,v.textureHeight,!1),C=new vr(v.textureWidth,v.textureHeight,{format:Ki,type:Si,depthTexture:new Uo(v.textureWidth,v.textureHeight,ne,void 0,void 0,void 0,void 0,void 0,void 0,fe),stencilBuffer:P.stencil,colorSpace:e.outputColorSpace,samples:P.antialias?4:0,resolveDepthBuffer:v.ignoreDepthValues===!1,resolveStencilBuffer:v.ignoreDepthValues===!1})}else{const fe={antialias:P.antialias,alpha:!0,depth:P.depth,stencil:P.stencil,framebufferScaleFactor:l};_=new XRWebGLLayer(a,t,fe),a.updateRenderState({baseLayer:_}),e.setPixelRatio(1),e.setSize(_.framebufferWidth,_.framebufferHeight,!1),C=new vr(_.framebufferWidth,_.framebufferHeight,{format:Ki,type:Si,colorSpace:e.outputColorSpace,stencilBuffer:P.stencil,resolveDepthBuffer:_.ignoreDepthValues===!1,resolveStencilBuffer:_.ignoreDepthValues===!1})}C.isXRRenderTarget=!0,this.setFoveation(h),f=null,c=await a.requestReferenceSpace(d),Ge.setContext(a),Ge.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(a!==null)return a.environmentBlendMode},this.getDepthTexture=function(){return M.getDepthTexture()};function J(V){for(let xe=0;xe<V.removed.length;xe++){const fe=V.removed[xe],ne=N.indexOf(fe);ne>=0&&(N[ne]=null,I[ne].disconnect(fe))}for(let xe=0;xe<V.added.length;xe++){const fe=V.added[xe];let ne=N.indexOf(fe);if(ne===-1){for(let qe=0;qe<I.length;qe++)if(qe>=N.length){N.push(fe),ne=qe;break}else if(N[qe]===null){N[qe]=fe,ne=qe;break}if(ne===-1)break}const Le=I[ne];Le&&Le.connect(fe)}}const K=new te,re=new te;function de(V,xe,fe){K.setFromMatrixPosition(xe.matrixWorld),re.setFromMatrixPosition(fe.matrixWorld);const ne=K.distanceTo(re),Le=xe.projectionMatrix.elements,qe=fe.projectionMatrix.elements,Vt=Le[14]/(Le[10]-1),dt=Le[14]/(Le[10]+1),Dt=(Le[9]+1)/Le[5],Ct=(Le[9]-1)/Le[5],Et=(Le[8]-1)/Le[0],Zt=(qe[8]+1)/qe[0],un=Vt*Et,dn=Vt*Zt,sn=ne/(-Et+Zt),Ot=sn*-Et;if(xe.matrixWorld.decompose(V.position,V.quaternion,V.scale),V.translateX(Ot),V.translateZ(sn),V.matrixWorld.compose(V.position,V.quaternion,V.scale),V.matrixWorldInverse.copy(V.matrixWorld).invert(),Le[10]===-1)V.projectionMatrix.copy(xe.projectionMatrix),V.projectionMatrixInverse.copy(xe.projectionMatrixInverse);else{const Jt=Vt+sn,Q=dt+sn,Pn=un-Ot,Nt=dn+(ne-Ot),O=Dt*dt/Q*Jt,T=Ct*dt/Q*Jt;V.projectionMatrix.makePerspective(Pn,Nt,O,T,Jt,Q),V.projectionMatrixInverse.copy(V.projectionMatrix).invert()}}function F(V,xe){xe===null?V.matrixWorld.copy(V.matrix):V.matrixWorld.multiplyMatrices(xe.matrixWorld,V.matrix),V.matrixWorldInverse.copy(V.matrixWorld).invert()}this.updateCamera=function(V){if(a===null)return;let xe=V.near,fe=V.far;M.texture!==null&&(M.depthNear>0&&(xe=M.depthNear),M.depthFar>0&&(fe=M.depthFar)),X.near=z.near=D.near=xe,X.far=z.far=D.far=fe,(j!==X.near||le!==X.far)&&(a.updateRenderState({depthNear:X.near,depthFar:X.far}),j=X.near,le=X.far),X.layers.mask=V.layers.mask|6,D.layers.mask=X.layers.mask&-5,z.layers.mask=X.layers.mask&-3;const ne=V.parent,Le=X.cameras;F(X,ne);for(let qe=0;qe<Le.length;qe++)F(Le[qe],ne);Le.length===2?de(X,D,z):X.projectionMatrix.copy(D.projectionMatrix),ee(V,X,ne)};function ee(V,xe,fe){fe===null?V.matrix.copy(xe.matrixWorld):(V.matrix.copy(fe.matrixWorld),V.matrix.invert(),V.matrix.multiply(xe.matrixWorld)),V.matrix.decompose(V.position,V.quaternion,V.scale),V.updateMatrixWorld(!0),V.projectionMatrix.copy(xe.projectionMatrix),V.projectionMatrixInverse.copy(xe.projectionMatrixInverse),V.isPerspectiveCamera&&(V.fov=sm*2*Math.atan(1/V.projectionMatrix.elements[5]),V.zoom=1)}this.getCamera=function(){return X},this.getFoveation=function(){if(!(v===null&&_===null))return h},this.setFoveation=function(V){h=V,v!==null&&(v.fixedFoveation=V),_!==null&&_.fixedFoveation!==void 0&&(_.fixedFoveation=V)},this.hasDepthSensing=function(){return M.texture!==null},this.getDepthSensingMesh=function(){return M.getMesh(X)},this.getCameraTexture=function(V){return S[V]};let Ce=null;function Ve(V,xe){if(g=xe.getViewerPose(f||c),E=xe,g!==null){const fe=g.views;_!==null&&(e.setRenderTargetFramebuffer(C,_.framebuffer),e.setRenderTarget(C));let ne=!1;fe.length!==X.cameras.length&&(X.cameras.length=0,ne=!0);for(let dt=0;dt<fe.length;dt++){const Dt=fe[dt];let Ct=null;if(_!==null)Ct=_.getViewport(Dt);else{const Zt=p.getViewSubImage(v,Dt);Ct=Zt.viewport,dt===0&&(e.setRenderTargetTextures(C,Zt.colorTexture,Zt.depthStencilTexture),e.setRenderTarget(C))}let Et=H[dt];Et===void 0&&(Et=new Ii,Et.layers.enable(dt),Et.viewport=new cn,H[dt]=Et),Et.matrix.fromArray(Dt.transform.matrix),Et.matrix.decompose(Et.position,Et.quaternion,Et.scale),Et.projectionMatrix.fromArray(Dt.projectionMatrix),Et.projectionMatrixInverse.copy(Et.projectionMatrix).invert(),Et.viewport.set(Ct.x,Ct.y,Ct.width,Ct.height),dt===0&&(X.matrix.copy(Et.matrix),X.matrix.decompose(X.position,X.quaternion,X.scale)),ne===!0&&X.cameras.push(Et)}const Le=a.enabledFeatures;if(Le&&Le.includes("depth-sensing")&&a.depthUsage=="gpu-optimized"&&b){p=r.getBinding();const dt=p.getDepthInformation(fe[0]);dt&&dt.isValid&&dt.texture&&M.init(dt,a.renderState)}if(Le&&Le.includes("camera-access")&&b){e.state.unbindTexture(),p=r.getBinding();for(let dt=0;dt<fe.length;dt++){const Dt=fe[dt].camera;if(Dt){let Ct=S[Dt];Ct||(Ct=new Ry,S[Dt]=Ct);const Et=p.getCameraImage(Dt);Ct.sourceTexture=Et}}}}for(let fe=0;fe<I.length;fe++){const ne=N[fe],Le=I[fe];ne!==null&&Le!==void 0&&Le.update(ne,xe,f||c)}Ce&&Ce(V,xe),xe.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:xe}),E=null}const Ge=new Ny;Ge.setAnimationLoop(Ve),this.setAnimationLoop=function(V){Ce=V},this.dispose=function(){}}}const rP=new rn,ky=new pt;ky.set(-1,0,0,0,1,0,0,0,1);function sP(i,e){function t(M,S){M.matrixAutoUpdate===!0&&M.updateMatrix(),S.value.copy(M.matrix)}function r(M,S){S.color.getRGB(M.fogColor.value,Ay(i)),S.isFog?(M.fogNear.value=S.near,M.fogFar.value=S.far):S.isFogExp2&&(M.fogDensity.value=S.density)}function a(M,S,P,L,C){S.isNodeMaterial?S.uniformsNeedUpdate=!1:S.isMeshBasicMaterial?l(M,S):S.isMeshLambertMaterial?(l(M,S),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)):S.isMeshToonMaterial?(l(M,S),p(M,S)):S.isMeshPhongMaterial?(l(M,S),g(M,S),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)):S.isMeshStandardMaterial?(l(M,S),v(M,S),S.isMeshPhysicalMaterial&&_(M,S,C)):S.isMeshMatcapMaterial?(l(M,S),E(M,S)):S.isMeshDepthMaterial?l(M,S):S.isMeshDistanceMaterial?(l(M,S),b(M,S)):S.isMeshNormalMaterial?l(M,S):S.isLineBasicMaterial?(c(M,S),S.isLineDashedMaterial&&d(M,S)):S.isPointsMaterial?h(M,S,P,L):S.isSpriteMaterial?f(M,S):S.isShadowMaterial?(M.color.value.copy(S.color),M.opacity.value=S.opacity):S.isShaderMaterial&&(S.uniformsNeedUpdate=!1)}function l(M,S){M.opacity.value=S.opacity,S.color&&M.diffuse.value.copy(S.color),S.emissive&&M.emissive.value.copy(S.emissive).multiplyScalar(S.emissiveIntensity),S.map&&(M.map.value=S.map,t(S.map,M.mapTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.bumpMap&&(M.bumpMap.value=S.bumpMap,t(S.bumpMap,M.bumpMapTransform),M.bumpScale.value=S.bumpScale,S.side===hi&&(M.bumpScale.value*=-1)),S.normalMap&&(M.normalMap.value=S.normalMap,t(S.normalMap,M.normalMapTransform),M.normalScale.value.copy(S.normalScale),S.side===hi&&M.normalScale.value.negate()),S.displacementMap&&(M.displacementMap.value=S.displacementMap,t(S.displacementMap,M.displacementMapTransform),M.displacementScale.value=S.displacementScale,M.displacementBias.value=S.displacementBias),S.emissiveMap&&(M.emissiveMap.value=S.emissiveMap,t(S.emissiveMap,M.emissiveMapTransform)),S.specularMap&&(M.specularMap.value=S.specularMap,t(S.specularMap,M.specularMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest);const P=e.get(S),L=P.envMap,C=P.envMapRotation;L&&(M.envMap.value=L,M.envMapRotation.value.setFromMatrix4(rP.makeRotationFromEuler(C)).transpose(),L.isCubeTexture&&L.isRenderTargetTexture===!1&&M.envMapRotation.value.premultiply(ky),M.reflectivity.value=S.reflectivity,M.ior.value=S.ior,M.refractionRatio.value=S.refractionRatio),S.lightMap&&(M.lightMap.value=S.lightMap,M.lightMapIntensity.value=S.lightMapIntensity,t(S.lightMap,M.lightMapTransform)),S.aoMap&&(M.aoMap.value=S.aoMap,M.aoMapIntensity.value=S.aoMapIntensity,t(S.aoMap,M.aoMapTransform))}function c(M,S){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,S.map&&(M.map.value=S.map,t(S.map,M.mapTransform))}function d(M,S){M.dashSize.value=S.dashSize,M.totalSize.value=S.dashSize+S.gapSize,M.scale.value=S.scale}function h(M,S,P,L){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,M.size.value=S.size*P,M.scale.value=L*.5,S.map&&(M.map.value=S.map,t(S.map,M.uvTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest)}function f(M,S){M.diffuse.value.copy(S.color),M.opacity.value=S.opacity,M.rotation.value=S.rotation,S.map&&(M.map.value=S.map,t(S.map,M.mapTransform)),S.alphaMap&&(M.alphaMap.value=S.alphaMap,t(S.alphaMap,M.alphaMapTransform)),S.alphaTest>0&&(M.alphaTest.value=S.alphaTest)}function g(M,S){M.specular.value.copy(S.specular),M.shininess.value=Math.max(S.shininess,1e-4)}function p(M,S){S.gradientMap&&(M.gradientMap.value=S.gradientMap)}function v(M,S){M.metalness.value=S.metalness,S.metalnessMap&&(M.metalnessMap.value=S.metalnessMap,t(S.metalnessMap,M.metalnessMapTransform)),M.roughness.value=S.roughness,S.roughnessMap&&(M.roughnessMap.value=S.roughnessMap,t(S.roughnessMap,M.roughnessMapTransform)),S.envMap&&(M.envMapIntensity.value=S.envMapIntensity)}function _(M,S,P){M.ior.value=S.ior,S.sheen>0&&(M.sheenColor.value.copy(S.sheenColor).multiplyScalar(S.sheen),M.sheenRoughness.value=S.sheenRoughness,S.sheenColorMap&&(M.sheenColorMap.value=S.sheenColorMap,t(S.sheenColorMap,M.sheenColorMapTransform)),S.sheenRoughnessMap&&(M.sheenRoughnessMap.value=S.sheenRoughnessMap,t(S.sheenRoughnessMap,M.sheenRoughnessMapTransform))),S.clearcoat>0&&(M.clearcoat.value=S.clearcoat,M.clearcoatRoughness.value=S.clearcoatRoughness,S.clearcoatMap&&(M.clearcoatMap.value=S.clearcoatMap,t(S.clearcoatMap,M.clearcoatMapTransform)),S.clearcoatRoughnessMap&&(M.clearcoatRoughnessMap.value=S.clearcoatRoughnessMap,t(S.clearcoatRoughnessMap,M.clearcoatRoughnessMapTransform)),S.clearcoatNormalMap&&(M.clearcoatNormalMap.value=S.clearcoatNormalMap,t(S.clearcoatNormalMap,M.clearcoatNormalMapTransform),M.clearcoatNormalScale.value.copy(S.clearcoatNormalScale),S.side===hi&&M.clearcoatNormalScale.value.negate())),S.dispersion>0&&(M.dispersion.value=S.dispersion),S.iridescence>0&&(M.iridescence.value=S.iridescence,M.iridescenceIOR.value=S.iridescenceIOR,M.iridescenceThicknessMinimum.value=S.iridescenceThicknessRange[0],M.iridescenceThicknessMaximum.value=S.iridescenceThicknessRange[1],S.iridescenceMap&&(M.iridescenceMap.value=S.iridescenceMap,t(S.iridescenceMap,M.iridescenceMapTransform)),S.iridescenceThicknessMap&&(M.iridescenceThicknessMap.value=S.iridescenceThicknessMap,t(S.iridescenceThicknessMap,M.iridescenceThicknessMapTransform))),S.transmission>0&&(M.transmission.value=S.transmission,M.transmissionSamplerMap.value=P.texture,M.transmissionSamplerSize.value.set(P.width,P.height),S.transmissionMap&&(M.transmissionMap.value=S.transmissionMap,t(S.transmissionMap,M.transmissionMapTransform)),M.thickness.value=S.thickness,S.thicknessMap&&(M.thicknessMap.value=S.thicknessMap,t(S.thicknessMap,M.thicknessMapTransform)),M.attenuationDistance.value=S.attenuationDistance,M.attenuationColor.value.copy(S.attenuationColor)),S.anisotropy>0&&(M.anisotropyVector.value.set(S.anisotropy*Math.cos(S.anisotropyRotation),S.anisotropy*Math.sin(S.anisotropyRotation)),S.anisotropyMap&&(M.anisotropyMap.value=S.anisotropyMap,t(S.anisotropyMap,M.anisotropyMapTransform))),M.specularIntensity.value=S.specularIntensity,M.specularColor.value.copy(S.specularColor),S.specularColorMap&&(M.specularColorMap.value=S.specularColorMap,t(S.specularColorMap,M.specularColorMapTransform)),S.specularIntensityMap&&(M.specularIntensityMap.value=S.specularIntensityMap,t(S.specularIntensityMap,M.specularIntensityMapTransform))}function E(M,S){S.matcap&&(M.matcap.value=S.matcap)}function b(M,S){const P=e.get(S).light;M.referencePosition.value.setFromMatrixPosition(P.matrixWorld),M.nearDistance.value=P.shadow.camera.near,M.farDistance.value=P.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:a}}function aP(i,e,t,r){let a={},l={},c=[];const d=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function h(C,I){const N=I.program;r.uniformBlockBinding(C,N)}function f(C,I){let N=a[C.id];N===void 0&&(M(C),N=g(C),a[C.id]=N,C.addEventListener("dispose",P));const U=I.program;r.updateUBOMapping(C,U);const w=e.render.frame;l[C.id]!==w&&(v(C),l[C.id]=w)}function g(C){const I=p();C.__bindingPointIndex=I;const N=i.createBuffer(),U=C.__size,w=C.usage;return i.bindBuffer(i.UNIFORM_BUFFER,N),i.bufferData(i.UNIFORM_BUFFER,U,w),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,I,N),N}function p(){for(let C=0;C<d;C++)if(c.indexOf(C)===-1)return c.push(C),C;return Pt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function v(C){const I=a[C.id],N=C.uniforms,U=C.__cache;i.bindBuffer(i.UNIFORM_BUFFER,I);for(let w=0,D=N.length;w<D;w++){const z=N[w];if(Array.isArray(z))for(let H=0,X=z.length;H<X;H++)_(z[H],w,H,U);else _(z,w,0,U)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function _(C,I,N,U){if(b(C,I,N,U)===!0){const w=C.__offset,D=C.value;if(Array.isArray(D)){let z=0;for(let H=0;H<D.length;H++){const X=D[H],j=S(X);E(X,C.__data,z),typeof X!="number"&&typeof X!="boolean"&&!X.isMatrix3&&!ArrayBuffer.isView(X)&&(z+=j.storage/Float32Array.BYTES_PER_ELEMENT)}}else E(D,C.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,w,C.__data)}}function E(C,I,N){typeof C=="number"||typeof C=="boolean"?I[0]=C:C.isMatrix3?(I[0]=C.elements[0],I[1]=C.elements[1],I[2]=C.elements[2],I[3]=0,I[4]=C.elements[3],I[5]=C.elements[4],I[6]=C.elements[5],I[7]=0,I[8]=C.elements[6],I[9]=C.elements[7],I[10]=C.elements[8],I[11]=0):ArrayBuffer.isView(C)?I.set(new C.constructor(C.buffer,C.byteOffset,I.length)):C.toArray(I,N)}function b(C,I,N,U){const w=C.value,D=I+"_"+N;if(U[D]===void 0)return typeof w=="number"||typeof w=="boolean"?U[D]=w:ArrayBuffer.isView(w)?U[D]=w.slice():U[D]=w.clone(),!0;{const z=U[D];if(typeof w=="number"||typeof w=="boolean"){if(z!==w)return U[D]=w,!0}else{if(ArrayBuffer.isView(w))return!0;if(z.equals(w)===!1)return z.copy(w),!0}}return!1}function M(C){const I=C.uniforms;let N=0;const U=16;for(let D=0,z=I.length;D<z;D++){const H=Array.isArray(I[D])?I[D]:[I[D]];for(let X=0,j=H.length;X<j;X++){const le=H[X],$=Array.isArray(le.value)?le.value:[le.value];for(let ue=0,J=$.length;ue<J;ue++){const K=$[ue],re=S(K),de=N%U,F=de%re.boundary,ee=de+F;N+=F,ee!==0&&U-ee<re.storage&&(N+=U-ee),le.__data=new Float32Array(re.storage/Float32Array.BYTES_PER_ELEMENT),le.__offset=N,N+=re.storage}}}const w=N%U;return w>0&&(N+=U-w),C.__size=N,C.__cache={},this}function S(C){const I={boundary:0,storage:0};return typeof C=="number"||typeof C=="boolean"?(I.boundary=4,I.storage=4):C.isVector2?(I.boundary=8,I.storage=8):C.isVector3||C.isColor?(I.boundary=16,I.storage=12):C.isVector4?(I.boundary=16,I.storage=16):C.isMatrix3?(I.boundary=48,I.storage=48):C.isMatrix4?(I.boundary=64,I.storage=64):C.isTexture?ot("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(C)?(I.boundary=16,I.storage=C.byteLength):ot("WebGLRenderer: Unsupported uniform value type.",C),I}function P(C){const I=C.target;I.removeEventListener("dispose",P);const N=c.indexOf(I.__bindingPointIndex);c.splice(N,1),i.deleteBuffer(a[I.id]),delete a[I.id],delete l[I.id]}function L(){for(const C in a)i.deleteBuffer(a[C]);c=[],a={},l={}}return{bind:h,update:f,dispose:L}}const oP=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let ar=null;function lP(){return ar===null&&(ar=new Hb(oP,16,16,wa,Kr),ar.name="DFG_LUT",ar.minFilter=jn,ar.magFilter=jn,ar.wrapS=jr,ar.wrapT=jr,ar.generateMipmaps=!1,ar.needsUpdate=!0),ar}class cP{constructor(e={}){const{canvas:t=xb(),context:r=null,depth:a=!0,stencil:l=!1,alpha:c=!1,antialias:d=!1,premultipliedAlpha:h=!0,preserveDrawingBuffer:f=!1,powerPreference:g="default",failIfMajorPerformanceCaveat:p=!1,reversedDepthBuffer:v=!1,outputBufferType:_=Si}=e;this.isWebGLRenderer=!0;let E;if(r!==null){if(typeof WebGLRenderingContext<"u"&&r instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=r.getContextAttributes().alpha}else E=c;const b=_,M=new Set([Fm,Um,Im]),S=new Set([Si,yr,Wl,Xl,Lm,Dm]),P=new Uint32Array(4),L=new Int32Array(4),C=new te;let I=null,N=null;const U=[],w=[];let D=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=xr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const z=this;let H=!1,X=null,j=null,le=null,$=null;this._outputColorSpace=Jn;let ue=0,J=0,K=null,re=-1,de=null;const F=new cn,ee=new cn;let Ce=null;const Ve=new gt(0);let Ge=0,V=t.width,xe=t.height,fe=1,ne=null,Le=null;const qe=new cn(0,0,V,xe),Vt=new cn(0,0,V,xe);let dt=!1;const Dt=new Bm;let Ct=!1,Et=!1;const Zt=new rn,un=new te,dn=new cn,sn={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ot=!1;function Jt(){return K===null?fe:1}let Q=r;function Pn(A,Z){return t.getContext(A,Z)}try{const A={alpha:!0,depth:a,stencil:l,antialias:d,premultipliedAlpha:h,preserveDrawingBuffer:f,powerPreference:g,failIfMajorPerformanceCaveat:p};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Rm}`),t.addEventListener("webglcontextlost",Gt,!1),t.addEventListener("webglcontextrestored",It,!1),t.addEventListener("webglcontextcreationerror",Fn,!1),Q===null){const Z="webgl2";if(Q=Pn(Z,A),Q===null)throw Pn(Z)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(A){throw Pt("WebGLRenderer: "+A.message),A}let Nt,O,T,ie,he,ge,be,De,ve,ye,Ue,Ze,Fe,Ne,nt,rt,lt,q,Pe,_e,Ie,Oe,Se;function Ke(){Nt=new lA(Q),Nt.init(),Ie=new J2(Q,Nt),O=new eA(Q,Nt,e,Ie),T=new Q2(Q,Nt),O.reversedDepthBuffer&&v&&T.buffers.depth.setReversed(!0),j=Q.createFramebuffer(),le=Q.createFramebuffer(),$=Q.createFramebuffer(),ie=new dA(Q),he=new O2,ge=new Z2(Q,Nt,T,he,O,Ie,ie),be=new oA(z),De=new mT(Q),Oe=new ZR(Q,De),ve=new cA(Q,De,ie,Oe),ye=new fA(Q,ve,De,Oe,ie),q=new hA(Q,O,ge),nt=new tA(he),Ue=new F2(z,be,Nt,O,Oe,nt),Ze=new sP(z,he),Fe=new z2,Ne=new W2(Nt),lt=new QR(z,be,T,ye,E,h),rt=new Y2(z,ye,O),Se=new aP(Q,ie,O,T),Pe=new JR(Q,Nt,ie),_e=new uA(Q,Nt,ie),ie.programs=Ue.programs,z.capabilities=O,z.extensions=Nt,z.properties=he,z.renderLists=Fe,z.shadowMap=rt,z.state=T,z.info=ie}Ke(),b!==Si&&(D=new mA(b,t.width,t.height,d,a,l));const Xe=new iP(z,Q);this.xr=Xe,this.getContext=function(){return Q},this.getContextAttributes=function(){return Q.getContextAttributes()},this.forceContextLoss=function(){const A=Nt.get("WEBGL_lose_context");A&&A.loseContext()},this.forceContextRestore=function(){const A=Nt.get("WEBGL_lose_context");A&&A.restoreContext()},this.getPixelRatio=function(){return fe},this.setPixelRatio=function(A){A!==void 0&&(fe=A,this.setSize(V,xe,!1))},this.getSize=function(A){return A.set(V,xe)},this.setSize=function(A,Z,pe=!0){if(Xe.isPresenting){ot("WebGLRenderer: Can't change size while VR device is presenting.");return}V=A,xe=Z,t.width=Math.floor(A*fe),t.height=Math.floor(Z*fe),pe===!0&&(t.style.width=A+"px",t.style.height=Z+"px"),D!==null&&D.setSize(t.width,t.height),this.setViewport(0,0,A,Z)},this.getDrawingBufferSize=function(A){return A.set(V*fe,xe*fe).floor()},this.setDrawingBufferSize=function(A,Z,pe){V=A,xe=Z,fe=pe,t.width=Math.floor(A*pe),t.height=Math.floor(Z*pe),this.setViewport(0,0,A,Z)},this.setEffects=function(A){if(b===Si){Pt("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(A){for(let Z=0;Z<A.length;Z++)if(A[Z].isOutputPass===!0){ot("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}D.setEffects(A||[])},this.getCurrentViewport=function(A){return A.copy(F)},this.getViewport=function(A){return A.copy(qe)},this.setViewport=function(A,Z,pe,oe){A.isVector4?qe.set(A.x,A.y,A.z,A.w):qe.set(A,Z,pe,oe),T.viewport(F.copy(qe).multiplyScalar(fe).round())},this.getScissor=function(A){return A.copy(Vt)},this.setScissor=function(A,Z,pe,oe){A.isVector4?Vt.set(A.x,A.y,A.z,A.w):Vt.set(A,Z,pe,oe),T.scissor(ee.copy(Vt).multiplyScalar(fe).round())},this.getScissorTest=function(){return dt},this.setScissorTest=function(A){T.setScissorTest(dt=A)},this.setOpaqueSort=function(A){ne=A},this.setTransparentSort=function(A){Le=A},this.getClearColor=function(A){return A.copy(lt.getClearColor())},this.setClearColor=function(){lt.setClearColor(...arguments)},this.getClearAlpha=function(){return lt.getClearAlpha()},this.setClearAlpha=function(){lt.setClearAlpha(...arguments)},this.clear=function(A=!0,Z=!0,pe=!0){let oe=0;if(A){let ae=!1;if(K!==null){const Ae=K.texture.format;ae=M.has(Ae)}if(ae){const Ae=K.texture.type,je=S.has(Ae),Re=lt.getClearColor(),Ye=lt.getClearAlpha(),tt=Re.r,ht=Re.g,ft=Re.b;je?(P[0]=tt,P[1]=ht,P[2]=ft,P[3]=Ye,Q.clearBufferuiv(Q.COLOR,0,P)):(L[0]=tt,L[1]=ht,L[2]=ft,L[3]=Ye,Q.clearBufferiv(Q.COLOR,0,L))}else oe|=Q.COLOR_BUFFER_BIT}Z&&(oe|=Q.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),pe&&(oe|=Q.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),oe!==0&&Q.clear(oe)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(A){A.setRenderer(this),X=A},this.dispose=function(){t.removeEventListener("webglcontextlost",Gt,!1),t.removeEventListener("webglcontextrestored",It,!1),t.removeEventListener("webglcontextcreationerror",Fn,!1),lt.dispose(),Fe.dispose(),Ne.dispose(),he.dispose(),be.dispose(),ye.dispose(),Oe.dispose(),Se.dispose(),Ue.dispose(),Xe.dispose(),Xe.removeEventListener("sessionstart",ac),Xe.removeEventListener("sessionend",oc),Xn.stop()};function Gt(A){A.preventDefault(),Zx("WebGLRenderer: Context Lost."),H=!0}function It(){Zx("WebGLRenderer: Context Restored."),H=!1;const A=ie.autoReset,Z=rt.enabled,pe=rt.autoUpdate,oe=rt.needsUpdate,ae=rt.type;Ke(),ie.autoReset=A,rt.enabled=Z,rt.autoUpdate=pe,rt.needsUpdate=oe,rt.type=ae}function Fn(A){Pt("WebGLRenderer: A WebGL context could not be created. Reason: ",A.statusMessage)}function wi(A){const Z=A.target;Z.removeEventListener("dispose",wi),Bs(Z)}function Bs(A){Ta(A),he.remove(A)}function Ta(A){const Z=he.get(A).programs;Z!==void 0&&(Z.forEach(function(pe){Ue.releaseProgram(pe)}),A.isShaderMaterial&&Ue.releaseShaderCache(A))}this.renderBufferDirect=function(A,Z,pe,oe,ae,Ae){Z===null&&(Z=sn);const je=ae.isMesh&&ae.matrixWorld.determinantAffine()<0,Re=an(A,Z,pe,oe,ae);T.setMaterial(oe,je);let Ye=pe.index,tt=1;if(oe.wireframe===!0){if(Ye=ve.getWireframeAttribute(pe),Ye===void 0)return;tt=2}const ht=pe.drawRange,ft=pe.attributes.position;let Je=ht.start*tt,Rt=(ht.start+ht.count)*tt;Ae!==null&&(Je=Math.max(Je,Ae.start*tt),Rt=Math.min(Rt,(Ae.start+Ae.count)*tt)),Ye!==null?(Je=Math.max(Je,0),Rt=Math.min(Rt,Ye.count)):ft!=null&&(Je=Math.max(Je,0),Rt=Math.min(Rt,ft.count));const Xt=Rt-Je;if(Xt<0||Xt===1/0)return;Oe.setup(ae,oe,Re,pe,Ye);let en,kt=Pe;if(Ye!==null&&(en=De.get(Ye),kt=_e,kt.setIndex(en)),ae.isMesh)oe.wireframe===!0?(T.setLineWidth(oe.wireframeLinewidth*Jt()),kt.setMode(Q.LINES)):kt.setMode(Q.TRIANGLES);else if(ae.isLine){let mn=oe.linewidth;mn===void 0&&(mn=1),T.setLineWidth(mn*Jt()),ae.isLineSegments?kt.setMode(Q.LINES):ae.isLineLoop?kt.setMode(Q.LINE_LOOP):kt.setMode(Q.LINE_STRIP)}else ae.isPoints?kt.setMode(Q.POINTS):ae.isSprite&&kt.setMode(Q.TRIANGLES);if(ae.isBatchedMesh)if(Nt.get("WEBGL_multi_draw"))kt.renderMultiDraw(ae._multiDrawStarts,ae._multiDrawCounts,ae._multiDrawCount);else{const mn=ae._multiDrawStarts,Be=ae._multiDrawCounts,Nn=ae._multiDrawCount,vt=Ye?De.get(Ye).bytesPerElement:1,ei=he.get(oe).currentProgram.getUniforms();for(let ti=0;ti<Nn;ti++)ei.setValue(Q,"_gl_DrawID",ti),kt.render(mn[ti]/vt,Be[ti])}else if(ae.isInstancedMesh)kt.renderInstances(Je,Xt,ae.count);else if(pe.isInstancedBufferGeometry){const mn=pe._maxInstanceCount!==void 0?pe._maxInstanceCount:1/0,Be=Math.min(pe.instanceCount,mn);kt.renderInstances(Je,Xt,Be)}else kt.render(Je,Xt)};function Hs(A,Z,pe){A.transparent===!0&&A.side===hr&&A.forceSinglePass===!1?(A.side=hi,A.needsUpdate=!0,js(A,Z,pe),A.side=Os,A.needsUpdate=!0,js(A,Z,pe),A.side=hr):js(A,Z,pe)}this.compile=function(A,Z,pe=null){pe===null&&(pe=A),N=Ne.get(pe),N.init(Z),w.push(N),pe.traverseVisible(function(ae){ae.isLight&&ae.layers.test(Z.layers)&&(N.pushLight(ae),ae.castShadow&&N.pushShadow(ae))}),A!==pe&&A.traverseVisible(function(ae){ae.isLight&&ae.layers.test(Z.layers)&&(N.pushLight(ae),ae.castShadow&&N.pushShadow(ae))}),N.setupLights();const oe=new Set;return A.traverse(function(ae){if(!(ae.isMesh||ae.isPoints||ae.isLine||ae.isSprite))return;const Ae=ae.material;if(Ae)if(Array.isArray(Ae))for(let je=0;je<Ae.length;je++){const Re=Ae[je];Hs(Re,pe,ae),oe.add(Re)}else Hs(Ae,pe,ae),oe.add(Ae)}),N=w.pop(),oe},this.compileAsync=function(A,Z,pe=null){const oe=this.compile(A,Z,pe);return new Promise(ae=>{function Ae(){if(oe.forEach(function(je){he.get(je).currentProgram.isReady()&&oe.delete(je)}),oe.size===0){ae(A);return}setTimeout(Ae,10)}Nt.get("KHR_parallel_shader_compile")!==null?Ae():setTimeout(Ae,10)})};let Vs=null;function wd(A){Vs&&Vs(A)}function ac(){Xn.stop()}function oc(){Xn.start()}const Xn=new Ny;Xn.setAnimationLoop(wd),typeof self<"u"&&Xn.setContext(self),this.setAnimationLoop=function(A){Vs=A,Xe.setAnimationLoop(A),A===null?Xn.stop():Xn.start()},Xe.addEventListener("sessionstart",ac),Xe.addEventListener("sessionend",oc),this.render=function(A,Z){if(Z!==void 0&&Z.isCamera!==!0){Pt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(H===!0)return;X!==null&&X.renderStart(A,Z);const pe=Xe.enabled===!0&&Xe.isPresenting===!0,oe=D!==null&&(K===null||pe)&&D.begin(z,K);if(A.matrixWorldAutoUpdate===!0&&A.updateMatrixWorld(),Z.parent===null&&Z.matrixWorldAutoUpdate===!0&&Z.updateMatrixWorld(),Xe.enabled===!0&&Xe.isPresenting===!0&&(D===null||D.isCompositing()===!1)&&(Xe.cameraAutoUpdate===!0&&Xe.updateCamera(Z),Z=Xe.getCamera()),A.isScene===!0&&A.onBeforeRender(z,A,Z,K),N=Ne.get(A,w.length),N.init(Z),N.state.textureUnits=ge.getTextureUnits(),w.push(N),Zt.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),Dt.setFromProjectionMatrix(Zt,mr,Z.reversedDepth),Et=this.localClippingEnabled,Ct=nt.init(this.clippingPlanes,Et),I=Fe.get(A,U.length),I.init(),U.push(I),Xe.enabled===!0&&Xe.isPresenting===!0){const je=z.xr.getDepthSensingMesh();je!==null&&Ca(je,Z,-1/0,z.sortObjects)}Ca(A,Z,0,z.sortObjects),I.finish(),z.sortObjects===!0&&I.sort(ne,Le,Z.reversedDepth),Ot=Xe.enabled===!1||Xe.isPresenting===!1||Xe.hasDepthSensing()===!1,Ot&&lt.addToRenderList(I,A),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Ct===!0&&nt.beginShadows();const ae=N.state.shadowsArray;if(rt.render(ae,A,Z),Ct===!0&&nt.endShadows(),(oe&&D.hasRenderPass())===!1){const je=I.opaque,Re=I.transmissive;if(N.setupLights(),Z.isArrayCamera){const Ye=Z.cameras;if(Re.length>0)for(let tt=0,ht=Ye.length;tt<ht;tt++){const ft=Ye[tt];lc(je,Re,A,ft)}Ot&&lt.render(A);for(let tt=0,ht=Ye.length;tt<ht;tt++){const ft=Ye[tt];jo(I,A,ft,ft.viewport)}}else Re.length>0&&lc(je,Re,A,Z),Ot&&lt.render(A),jo(I,A,Z)}K!==null&&J===0&&(ge.updateMultisampleRenderTarget(K),ge.updateRenderTargetMipmap(K)),oe&&D.end(z),A.isScene===!0&&A.onAfterRender(z,A,Z),Oe.resetDefaultState(),re=-1,de=null,w.pop(),w.length>0?(N=w[w.length-1],ge.setTextureUnits(N.state.textureUnits),Ct===!0&&nt.setGlobalState(z.clippingPlanes,N.state.camera)):N=null,U.pop(),U.length>0?I=U[U.length-1]:I=null,X!==null&&X.renderEnd()};function Ca(A,Z,pe,oe){if(A.visible===!1)return;if(A.layers.test(Z.layers)){if(A.isGroup)pe=A.renderOrder;else if(A.isLOD)A.autoUpdate===!0&&A.update(Z);else if(A.isLightProbeGrid)N.pushLightProbeGrid(A);else if(A.isLight)N.pushLight(A),A.castShadow&&N.pushShadow(A);else if(A.isSprite){if(!A.frustumCulled||Dt.intersectsSprite(A)){oe&&dn.setFromMatrixPosition(A.matrixWorld).applyMatrix4(Zt);const je=ye.update(A),Re=A.material;Re.visible&&I.push(A,je,Re,pe,dn.z,null)}}else if((A.isMesh||A.isLine||A.isPoints)&&(!A.frustumCulled||Dt.intersectsObject(A))){const je=ye.update(A),Re=A.material;if(oe&&(A.boundingSphere!==void 0?(A.boundingSphere===null&&A.computeBoundingSphere(),dn.copy(A.boundingSphere.center)):(je.boundingSphere===null&&je.computeBoundingSphere(),dn.copy(je.boundingSphere.center)),dn.applyMatrix4(A.matrixWorld).applyMatrix4(Zt)),Array.isArray(Re)){const Ye=je.groups;for(let tt=0,ht=Ye.length;tt<ht;tt++){const ft=Ye[tt],Je=Re[ft.materialIndex];Je&&Je.visible&&I.push(A,je,Je,pe,dn.z,ft)}}else Re.visible&&I.push(A,je,Re,pe,dn.z,null)}}const Ae=A.children;for(let je=0,Re=Ae.length;je<Re;je++)Ca(Ae[je],Z,pe,oe)}function jo(A,Z,pe,oe){const{opaque:ae,transmissive:Ae,transparent:je}=A;N.setupLightsView(pe),Ct===!0&&nt.setGlobalState(z.clippingPlanes,pe),oe&&T.viewport(F.copy(oe)),ae.length>0&&Gs(ae,Z,pe),Ae.length>0&&Gs(Ae,Z,pe),je.length>0&&Gs(je,Z,pe),T.buffers.depth.setTest(!0),T.buffers.depth.setMask(!0),T.buffers.color.setMask(!0),T.setPolygonOffset(!1)}function lc(A,Z,pe,oe){if((pe.isScene===!0?pe.overrideMaterial:null)!==null)return;if(N.state.transmissionRenderTarget[oe.id]===void 0){const Je=Nt.has("EXT_color_buffer_half_float")||Nt.has("EXT_color_buffer_float");N.state.transmissionRenderTarget[oe.id]=new vr(1,1,{generateMipmaps:!0,type:Je?Kr:Si,minFilter:da,samples:Math.max(4,O.samples),stencilBuffer:l,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Tt.workingColorSpace})}const Ae=N.state.transmissionRenderTarget[oe.id],je=oe.viewport||F;Ae.setSize(je.z*z.transmissionResolutionScale,je.w*z.transmissionResolutionScale);const Re=z.getRenderTarget(),Ye=z.getActiveCubeFace(),tt=z.getActiveMipmapLevel();z.setRenderTarget(Ae),z.getClearColor(Ve),Ge=z.getClearAlpha(),Ge<1&&z.setClearColor(16777215,.5),z.clear(),Ot&&lt.render(pe);const ht=z.toneMapping;z.toneMapping=xr;const ft=oe.viewport;if(oe.viewport!==void 0&&(oe.viewport=void 0),N.setupLightsView(oe),Ct===!0&&nt.setGlobalState(z.clippingPlanes,oe),Gs(A,pe,oe),ge.updateMultisampleRenderTarget(Ae),ge.updateRenderTargetMipmap(Ae),Nt.has("WEBGL_multisampled_render_to_texture")===!1){let Je=!1;for(let Rt=0,Xt=Z.length;Rt<Xt;Rt++){const en=Z[Rt],{object:kt,geometry:mn,material:Be,group:Nn}=en;if(Be.side===hr&&kt.layers.test(oe.layers)){const vt=Be.side;Be.side=hi,Be.needsUpdate=!0,Wo(kt,pe,oe,mn,Be,Nn),Be.side=vt,Be.needsUpdate=!0,Je=!0}}Je===!0&&(ge.updateMultisampleRenderTarget(Ae),ge.updateRenderTargetMipmap(Ae))}z.setRenderTarget(Re,Ye,tt),z.setClearColor(Ve,Ge),ft!==void 0&&(oe.viewport=ft),z.toneMapping=ht}function Gs(A,Z,pe){const oe=Z.isScene===!0?Z.overrideMaterial:null;for(let ae=0,Ae=A.length;ae<Ae;ae++){const je=A[ae],{object:Re,geometry:Ye,group:tt}=je;let ht=je.material;ht.allowOverride===!0&&oe!==null&&(ht=oe),Re.layers.test(pe.layers)&&Wo(Re,Z,pe,Ye,ht,tt)}}function Wo(A,Z,pe,oe,ae,Ae){A.onBeforeRender(z,Z,pe,oe,ae,Ae),A.modelViewMatrix.multiplyMatrices(pe.matrixWorldInverse,A.matrixWorld),A.normalMatrix.getNormalMatrix(A.modelViewMatrix),ae.onBeforeRender(z,Z,pe,oe,A,Ae),ae.transparent===!0&&ae.side===hr&&ae.forceSinglePass===!1?(ae.side=hi,ae.needsUpdate=!0,z.renderBufferDirect(pe,Z,oe,ae,A,Ae),ae.side=Os,ae.needsUpdate=!0,z.renderBufferDirect(pe,Z,oe,ae,A,Ae),ae.side=hr):z.renderBufferDirect(pe,Z,oe,ae,A,Ae),A.onAfterRender(z,Z,pe,oe,ae,Ae)}function js(A,Z,pe){Z.isScene!==!0&&(Z=sn);const oe=he.get(A),ae=N.state.lights,Ae=N.state.shadowsArray,je=ae.state.version,Re=Ue.getParameters(A,ae.state,Ae,Z,pe,N.state.lightProbeGridArray),Ye=Ue.getProgramCacheKey(Re);let tt=oe.programs;oe.environment=A.isMeshStandardMaterial||A.isMeshLambertMaterial||A.isMeshPhongMaterial?Z.environment:null,oe.fog=Z.fog;const ht=A.isMeshStandardMaterial||A.isMeshLambertMaterial&&!A.envMap||A.isMeshPhongMaterial&&!A.envMap;oe.envMap=be.get(A.envMap||oe.environment,ht),oe.envMapRotation=oe.environment!==null&&A.envMap===null?Z.environmentRotation:A.envMapRotation,tt===void 0&&(A.addEventListener("dispose",wi),tt=new Map,oe.programs=tt);let ft=tt.get(Ye);if(ft!==void 0){if(oe.currentProgram===ft&&oe.lightsStateVersion===je)return cc(A,Re),ft}else Re.uniforms=Ue.getUniforms(A),X!==null&&A.isNodeMaterial&&X.build(A,pe,Re),A.onBeforeCompile(Re,z),ft=Ue.acquireProgram(Re,Ye),tt.set(Ye,ft),oe.uniforms=Re.uniforms;const Je=oe.uniforms;return(!A.isShaderMaterial&&!A.isRawShaderMaterial||A.clipping===!0)&&(Je.clippingPlanes=nt.uniform),cc(A,Re),oe.needsLights=$o(A),oe.lightsStateVersion=je,oe.needsLights&&(Je.ambientLightColor.value=ae.state.ambient,Je.lightProbe.value=ae.state.probe,Je.directionalLights.value=ae.state.directional,Je.directionalLightShadows.value=ae.state.directionalShadow,Je.spotLights.value=ae.state.spot,Je.spotLightShadows.value=ae.state.spotShadow,Je.rectAreaLights.value=ae.state.rectArea,Je.ltc_1.value=ae.state.rectAreaLTC1,Je.ltc_2.value=ae.state.rectAreaLTC2,Je.pointLights.value=ae.state.point,Je.pointLightShadows.value=ae.state.pointShadow,Je.hemisphereLights.value=ae.state.hemi,Je.directionalShadowMatrix.value=ae.state.directionalShadowMatrix,Je.spotLightMatrix.value=ae.state.spotLightMatrix,Je.spotLightMap.value=ae.state.spotLightMap,Je.pointShadowMatrix.value=ae.state.pointShadowMatrix),oe.lightProbeGrid=N.state.lightProbeGridArray.length>0,oe.currentProgram=ft,oe.uniformsList=null,ft}function Xo(A){if(A.uniformsList===null){const Z=A.currentProgram.getUniforms();A.uniformsList=Zu.seqWithValue(Z.seq,A.uniforms)}return A.uniformsList}function cc(A,Z){const pe=he.get(A);pe.outputColorSpace=Z.outputColorSpace,pe.batching=Z.batching,pe.batchingColor=Z.batchingColor,pe.instancing=Z.instancing,pe.instancingColor=Z.instancingColor,pe.instancingMorph=Z.instancingMorph,pe.skinning=Z.skinning,pe.morphTargets=Z.morphTargets,pe.morphNormals=Z.morphNormals,pe.morphColors=Z.morphColors,pe.morphTargetsCount=Z.morphTargetsCount,pe.numClippingPlanes=Z.numClippingPlanes,pe.numIntersection=Z.numClipIntersection,pe.vertexAlphas=Z.vertexAlphas,pe.vertexTangents=Z.vertexTangents,pe.toneMapping=Z.toneMapping}function bd(A,Z){if(A.length===0)return null;if(A.length===1)return A[0].texture!==null?A[0]:null;C.setFromMatrixPosition(Z.matrixWorld);for(let pe=0,oe=A.length;pe<oe;pe++){const ae=A[pe];if(ae.texture!==null&&ae.boundingBox.containsPoint(C))return ae}return null}function an(A,Z,pe,oe,ae){Z.isScene!==!0&&(Z=sn),ge.resetTextureUnits();const Ae=Z.fog,je=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial?Z.environment:null,Re=K===null?z.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:Tt.workingColorSpace,Ye=oe.isMeshStandardMaterial||oe.isMeshLambertMaterial&&!oe.envMap||oe.isMeshPhongMaterial&&!oe.envMap,tt=be.get(oe.envMap||je,Ye),ht=oe.vertexColors===!0&&!!pe.attributes.color&&pe.attributes.color.itemSize===4,ft=!!pe.attributes.tangent&&(!!oe.normalMap||oe.anisotropy>0),Je=!!pe.morphAttributes.position,Rt=!!pe.morphAttributes.normal,Xt=!!pe.morphAttributes.color;let en=xr;oe.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(en=z.toneMapping);const kt=pe.morphAttributes.position||pe.morphAttributes.normal||pe.morphAttributes.color,mn=kt!==void 0?kt.length:0,Be=he.get(oe),Nn=N.state.lights;if(Ct===!0&&(Et===!0||A!==de)){const zt=A===de&&oe.id===re;nt.setState(oe,A,zt)}let vt=!1;oe.version===Be.__version?(Be.needsLights&&Be.lightsStateVersion!==Nn.state.version||Be.outputColorSpace!==Re||ae.isBatchedMesh&&Be.batching===!1||!ae.isBatchedMesh&&Be.batching===!0||ae.isBatchedMesh&&Be.batchingColor===!0&&ae.colorTexture===null||ae.isBatchedMesh&&Be.batchingColor===!1&&ae.colorTexture!==null||ae.isInstancedMesh&&Be.instancing===!1||!ae.isInstancedMesh&&Be.instancing===!0||ae.isSkinnedMesh&&Be.skinning===!1||!ae.isSkinnedMesh&&Be.skinning===!0||ae.isInstancedMesh&&Be.instancingColor===!0&&ae.instanceColor===null||ae.isInstancedMesh&&Be.instancingColor===!1&&ae.instanceColor!==null||ae.isInstancedMesh&&Be.instancingMorph===!0&&ae.morphTexture===null||ae.isInstancedMesh&&Be.instancingMorph===!1&&ae.morphTexture!==null||Be.envMap!==tt||oe.fog===!0&&Be.fog!==Ae||Be.numClippingPlanes!==void 0&&(Be.numClippingPlanes!==nt.numPlanes||Be.numIntersection!==nt.numIntersection)||Be.vertexAlphas!==ht||Be.vertexTangents!==ft||Be.morphTargets!==Je||Be.morphNormals!==Rt||Be.morphColors!==Xt||Be.toneMapping!==en||Be.morphTargetsCount!==mn||!!Be.lightProbeGrid!=N.state.lightProbeGridArray.length>0)&&(vt=!0):(vt=!0,Be.__version=oe.version);let ei=Be.currentProgram;vt===!0&&(ei=js(oe,Z,ae),X&&oe.isNodeMaterial&&X.onUpdateProgram(oe,ei,Be));let ti=!1,yt=!1,Er=!1;const Ut=ei.getUniforms(),Kt=Be.uniforms;if(T.useProgram(ei.program)&&(ti=!0,yt=!0,Er=!0),oe.id!==re&&(re=oe.id,yt=!0),Be.needsLights){const zt=bd(N.state.lightProbeGridArray,ae);Be.lightProbeGrid!==zt&&(Be.lightProbeGrid=zt,yt=!0)}if(ti||de!==A){T.buffers.depth.getReversed()&&A.reversedDepth!==!0&&(A._reversedDepth=!0,A.updateProjectionMatrix()),Ut.setValue(Q,"projectionMatrix",A.projectionMatrix),Ut.setValue(Q,"viewMatrix",A.matrixWorldInverse);const Oi=Ut.map.cameraPosition;Oi!==void 0&&Oi.setValue(Q,un.setFromMatrixPosition(A.matrixWorld)),O.logarithmicDepthBuffer&&Ut.setValue(Q,"logDepthBufFC",2/(Math.log(A.far+1)/Math.LN2)),(oe.isMeshPhongMaterial||oe.isMeshToonMaterial||oe.isMeshLambertMaterial||oe.isMeshBasicMaterial||oe.isMeshStandardMaterial||oe.isShaderMaterial)&&Ut.setValue(Q,"isOrthographic",A.isOrthographicCamera===!0),de!==A&&(de=A,yt=!0,Er=!0)}if(Be.needsLights&&(Nn.state.directionalShadowMap.length>0&&Ut.setValue(Q,"directionalShadowMap",Nn.state.directionalShadowMap,ge),Nn.state.spotShadowMap.length>0&&Ut.setValue(Q,"spotShadowMap",Nn.state.spotShadowMap,ge),Nn.state.pointShadowMap.length>0&&Ut.setValue(Q,"pointShadowMap",Nn.state.pointShadowMap,ge)),ae.isSkinnedMesh){Ut.setOptional(Q,ae,"bindMatrix"),Ut.setOptional(Q,ae,"bindMatrixInverse");const zt=ae.skeleton;zt&&(zt.boneTexture===null&&zt.computeBoneTexture(),Ut.setValue(Q,"boneTexture",zt.boneTexture,ge))}ae.isBatchedMesh&&(Ut.setOptional(Q,ae,"batchingTexture"),Ut.setValue(Q,"batchingTexture",ae._matricesTexture,ge),Ut.setOptional(Q,ae,"batchingIdTexture"),Ut.setValue(Q,"batchingIdTexture",ae._indirectTexture,ge),Ut.setOptional(Q,ae,"batchingColorTexture"),ae._colorsTexture!==null&&Ut.setValue(Q,"batchingColorTexture",ae._colorsTexture,ge));const Fi=pe.morphAttributes;if((Fi.position!==void 0||Fi.normal!==void 0||Fi.color!==void 0)&&q.update(ae,pe,ei),(yt||Be.receiveShadow!==ae.receiveShadow)&&(Be.receiveShadow=ae.receiveShadow,Ut.setValue(Q,"receiveShadow",ae.receiveShadow)),(oe.isMeshStandardMaterial||oe.isMeshLambertMaterial||oe.isMeshPhongMaterial)&&oe.envMap===null&&Z.environment!==null&&(Kt.envMapIntensity.value=Z.environmentIntensity),Kt.dfgLUT!==void 0&&(Kt.dfgLUT.value=lP()),yt){if(Ut.setValue(Q,"toneMappingExposure",z.toneMappingExposure),Be.needsLights&&Td(Kt,Er),Ae&&oe.fog===!0&&Ze.refreshFogUniforms(Kt,Ae),Ze.refreshMaterialUniforms(Kt,oe,fe,xe,N.state.transmissionRenderTarget[A.id]),Be.needsLights&&Be.lightProbeGrid){const zt=Be.lightProbeGrid;Kt.probesSH.value=zt.texture,Kt.probesMin.value.copy(zt.boundingBox.min),Kt.probesMax.value.copy(zt.boundingBox.max),Kt.probesResolution.value.copy(zt.resolution)}Zu.upload(Q,Xo(Be),Kt,ge)}if(oe.isShaderMaterial&&oe.uniformsNeedUpdate===!0&&(Zu.upload(Q,Xo(Be),Kt,ge),oe.uniformsNeedUpdate=!1),oe.isSpriteMaterial&&Ut.setValue(Q,"center",ae.center),Ut.setValue(Q,"modelViewMatrix",ae.modelViewMatrix),Ut.setValue(Q,"normalMatrix",ae.normalMatrix),Ut.setValue(Q,"modelMatrix",ae.matrixWorld),oe.uniformsGroups!==void 0){const zt=oe.uniformsGroups;for(let Oi=0,er=zt.length;Oi<er;Oi++){const Ws=zt[Oi];Se.update(Ws,ei),Se.bind(Ws,ei)}}return ei}function Td(A,Z){A.ambientLightColor.needsUpdate=Z,A.lightProbe.needsUpdate=Z,A.directionalLights.needsUpdate=Z,A.directionalLightShadows.needsUpdate=Z,A.pointLights.needsUpdate=Z,A.pointLightShadows.needsUpdate=Z,A.spotLights.needsUpdate=Z,A.spotLightShadows.needsUpdate=Z,A.rectAreaLights.needsUpdate=Z,A.hemisphereLights.needsUpdate=Z}function $o(A){return A.isMeshLambertMaterial||A.isMeshToonMaterial||A.isMeshPhongMaterial||A.isMeshStandardMaterial||A.isShadowMaterial||A.isShaderMaterial&&A.lights===!0}this.getActiveCubeFace=function(){return ue},this.getActiveMipmapLevel=function(){return J},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(A,Z,pe){const oe=he.get(A);oe.__autoAllocateDepthBuffer=A.resolveDepthBuffer===!1,oe.__autoAllocateDepthBuffer===!1&&(oe.__useRenderToTexture=!1),he.get(A.texture).__webglTexture=Z,he.get(A.depthTexture).__webglTexture=oe.__autoAllocateDepthBuffer?void 0:pe,oe.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(A,Z){const pe=he.get(A);pe.__webglFramebuffer=Z,pe.__useDefaultFramebuffer=Z===void 0},this.setRenderTarget=function(A,Z=0,pe=0){K=A,ue=Z,J=pe;let oe=null,ae=!1,Ae=!1;if(A){const Re=he.get(A);if(Re.__useDefaultFramebuffer!==void 0){T.bindFramebuffer(Q.FRAMEBUFFER,Re.__webglFramebuffer),F.copy(A.viewport),ee.copy(A.scissor),Ce=A.scissorTest,T.viewport(F),T.scissor(ee),T.setScissorTest(Ce),re=-1;return}else if(Re.__webglFramebuffer===void 0)ge.setupRenderTarget(A);else if(Re.__hasExternalTextures)ge.rebindTextures(A,he.get(A.texture).__webglTexture,he.get(A.depthTexture).__webglTexture);else if(A.depthBuffer){const ht=A.depthTexture;if(Re.__boundDepthTexture!==ht){if(ht!==null&&he.has(ht)&&(A.width!==ht.image.width||A.height!==ht.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");ge.setupDepthRenderbuffer(A)}}const Ye=A.texture;(Ye.isData3DTexture||Ye.isDataArrayTexture||Ye.isCompressedArrayTexture)&&(Ae=!0);const tt=he.get(A).__webglFramebuffer;A.isWebGLCubeRenderTarget?(Array.isArray(tt[Z])?oe=tt[Z][pe]:oe=tt[Z],ae=!0):A.samples>0&&ge.useMultisampledRTT(A)===!1?oe=he.get(A).__webglMultisampledFramebuffer:Array.isArray(tt)?oe=tt[pe]:oe=tt,F.copy(A.viewport),ee.copy(A.scissor),Ce=A.scissorTest}else F.copy(qe).multiplyScalar(fe).floor(),ee.copy(Vt).multiplyScalar(fe).floor(),Ce=dt;if(pe!==0&&(oe=j),T.bindFramebuffer(Q.FRAMEBUFFER,oe)&&T.drawBuffers(A,oe),T.viewport(F),T.scissor(ee),T.setScissorTest(Ce),ae){const Re=he.get(A.texture);Q.framebufferTexture2D(Q.FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_CUBE_MAP_POSITIVE_X+Z,Re.__webglTexture,pe)}else if(Ae){const Re=Z;for(let Ye=0;Ye<A.textures.length;Ye++){const tt=he.get(A.textures[Ye]);Q.framebufferTextureLayer(Q.FRAMEBUFFER,Q.COLOR_ATTACHMENT0+Ye,tt.__webglTexture,pe,Re)}}else if(A!==null&&pe!==0){const Re=he.get(A.texture);Q.framebufferTexture2D(Q.FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_2D,Re.__webglTexture,pe)}re=-1},this.readRenderTargetPixels=function(A,Z,pe,oe,ae,Ae,je,Re=0){if(!(A&&A.isWebGLRenderTarget)){Pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ye=he.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ye=Ye[je]),Ye){T.bindFramebuffer(Q.FRAMEBUFFER,Ye);try{const tt=A.textures[Re],ht=tt.format,ft=tt.type;if(A.textures.length>1&&Q.readBuffer(Q.COLOR_ATTACHMENT0+Re),!O.textureFormatReadable(ht)){Pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!O.textureTypeReadable(ft)){Pt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Z>=0&&Z<=A.width-oe&&pe>=0&&pe<=A.height-ae&&Q.readPixels(Z,pe,oe,ae,Ie.convert(ht),Ie.convert(ft),Ae)}finally{const tt=K!==null?he.get(K).__webglFramebuffer:null;T.bindFramebuffer(Q.FRAMEBUFFER,tt)}}},this.readRenderTargetPixelsAsync=async function(A,Z,pe,oe,ae,Ae,je,Re=0){if(!(A&&A.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ye=he.get(A).__webglFramebuffer;if(A.isWebGLCubeRenderTarget&&je!==void 0&&(Ye=Ye[je]),Ye)if(Z>=0&&Z<=A.width-oe&&pe>=0&&pe<=A.height-ae){T.bindFramebuffer(Q.FRAMEBUFFER,Ye);const tt=A.textures[Re],ht=tt.format,ft=tt.type;if(A.textures.length>1&&Q.readBuffer(Q.COLOR_ATTACHMENT0+Re),!O.textureFormatReadable(ht))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!O.textureTypeReadable(ft))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Je=Q.createBuffer();Q.bindBuffer(Q.PIXEL_PACK_BUFFER,Je),Q.bufferData(Q.PIXEL_PACK_BUFFER,Ae.byteLength,Q.STREAM_READ),Q.readPixels(Z,pe,oe,ae,Ie.convert(ht),Ie.convert(ft),0);const Rt=K!==null?he.get(K).__webglFramebuffer:null;T.bindFramebuffer(Q.FRAMEBUFFER,Rt);const Xt=Q.fenceSync(Q.SYNC_GPU_COMMANDS_COMPLETE,0);return Q.flush(),await vb(Q,Xt,4),Q.bindBuffer(Q.PIXEL_PACK_BUFFER,Je),Q.getBufferSubData(Q.PIXEL_PACK_BUFFER,0,Ae),Q.deleteBuffer(Je),Q.deleteSync(Xt),Ae}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(A,Z=null,pe=0){const oe=Math.pow(2,-pe),ae=Math.floor(A.image.width*oe),Ae=Math.floor(A.image.height*oe),je=Z!==null?Z.x:0,Re=Z!==null?Z.y:0;ge.setTexture2D(A,0),Q.copyTexSubImage2D(Q.TEXTURE_2D,pe,0,0,je,Re,ae,Ae),T.unbindTexture()},this.copyTextureToTexture=function(A,Z,pe=null,oe=null,ae=0,Ae=0){let je,Re,Ye,tt,ht,ft,Je,Rt,Xt;const en=A.isCompressedTexture?A.mipmaps[Ae]:A.image;if(pe!==null)je=pe.max.x-pe.min.x,Re=pe.max.y-pe.min.y,Ye=pe.isBox3?pe.max.z-pe.min.z:1,tt=pe.min.x,ht=pe.min.y,ft=pe.isBox3?pe.min.z:0;else{const Kt=Math.pow(2,-ae);je=Math.floor(en.width*Kt),Re=Math.floor(en.height*Kt),A.isDataArrayTexture?Ye=en.depth:A.isData3DTexture?Ye=Math.floor(en.depth*Kt):Ye=1,tt=0,ht=0,ft=0}oe!==null?(Je=oe.x,Rt=oe.y,Xt=oe.z):(Je=0,Rt=0,Xt=0);const kt=Ie.convert(Z.format),mn=Ie.convert(Z.type);let Be;Z.isData3DTexture?(ge.setTexture3D(Z,0),Be=Q.TEXTURE_3D):Z.isDataArrayTexture||Z.isCompressedArrayTexture?(ge.setTexture2DArray(Z,0),Be=Q.TEXTURE_2D_ARRAY):(ge.setTexture2D(Z,0),Be=Q.TEXTURE_2D),T.activeTexture(Q.TEXTURE0),T.pixelStorei(Q.UNPACK_FLIP_Y_WEBGL,Z.flipY),T.pixelStorei(Q.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Z.premultiplyAlpha),T.pixelStorei(Q.UNPACK_ALIGNMENT,Z.unpackAlignment);const Nn=T.getParameter(Q.UNPACK_ROW_LENGTH),vt=T.getParameter(Q.UNPACK_IMAGE_HEIGHT),ei=T.getParameter(Q.UNPACK_SKIP_PIXELS),ti=T.getParameter(Q.UNPACK_SKIP_ROWS),yt=T.getParameter(Q.UNPACK_SKIP_IMAGES);T.pixelStorei(Q.UNPACK_ROW_LENGTH,en.width),T.pixelStorei(Q.UNPACK_IMAGE_HEIGHT,en.height),T.pixelStorei(Q.UNPACK_SKIP_PIXELS,tt),T.pixelStorei(Q.UNPACK_SKIP_ROWS,ht),T.pixelStorei(Q.UNPACK_SKIP_IMAGES,ft);const Er=A.isDataArrayTexture||A.isData3DTexture,Ut=Z.isDataArrayTexture||Z.isData3DTexture;if(A.isDepthTexture){const Kt=he.get(A),Fi=he.get(Z),zt=he.get(Kt.__renderTarget),Oi=he.get(Fi.__renderTarget);T.bindFramebuffer(Q.READ_FRAMEBUFFER,zt.__webglFramebuffer),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,Oi.__webglFramebuffer);for(let er=0;er<Ye;er++)Er&&(Q.framebufferTextureLayer(Q.READ_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,he.get(A).__webglTexture,ae,ft+er),Q.framebufferTextureLayer(Q.DRAW_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,he.get(Z).__webglTexture,Ae,Xt+er)),Q.blitFramebuffer(tt,ht,je,Re,Je,Rt,je,Re,Q.DEPTH_BUFFER_BIT,Q.NEAREST);T.bindFramebuffer(Q.READ_FRAMEBUFFER,null),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,null)}else if(ae!==0||A.isRenderTargetTexture||he.has(A)){const Kt=he.get(A),Fi=he.get(Z);T.bindFramebuffer(Q.READ_FRAMEBUFFER,le),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,$);for(let zt=0;zt<Ye;zt++)Er?Q.framebufferTextureLayer(Q.READ_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Kt.__webglTexture,ae,ft+zt):Q.framebufferTexture2D(Q.READ_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_2D,Kt.__webglTexture,ae),Ut?Q.framebufferTextureLayer(Q.DRAW_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Fi.__webglTexture,Ae,Xt+zt):Q.framebufferTexture2D(Q.DRAW_FRAMEBUFFER,Q.COLOR_ATTACHMENT0,Q.TEXTURE_2D,Fi.__webglTexture,Ae),ae!==0?Q.blitFramebuffer(tt,ht,je,Re,Je,Rt,je,Re,Q.COLOR_BUFFER_BIT,Q.NEAREST):Ut?Q.copyTexSubImage3D(Be,Ae,Je,Rt,Xt+zt,tt,ht,je,Re):Q.copyTexSubImage2D(Be,Ae,Je,Rt,tt,ht,je,Re);T.bindFramebuffer(Q.READ_FRAMEBUFFER,null),T.bindFramebuffer(Q.DRAW_FRAMEBUFFER,null)}else Ut?A.isDataTexture||A.isData3DTexture?Q.texSubImage3D(Be,Ae,Je,Rt,Xt,je,Re,Ye,kt,mn,en.data):Z.isCompressedArrayTexture?Q.compressedTexSubImage3D(Be,Ae,Je,Rt,Xt,je,Re,Ye,kt,en.data):Q.texSubImage3D(Be,Ae,Je,Rt,Xt,je,Re,Ye,kt,mn,en):A.isDataTexture?Q.texSubImage2D(Q.TEXTURE_2D,Ae,Je,Rt,je,Re,kt,mn,en.data):A.isCompressedTexture?Q.compressedTexSubImage2D(Q.TEXTURE_2D,Ae,Je,Rt,en.width,en.height,kt,en.data):Q.texSubImage2D(Q.TEXTURE_2D,Ae,Je,Rt,je,Re,kt,mn,en);T.pixelStorei(Q.UNPACK_ROW_LENGTH,Nn),T.pixelStorei(Q.UNPACK_IMAGE_HEIGHT,vt),T.pixelStorei(Q.UNPACK_SKIP_PIXELS,ei),T.pixelStorei(Q.UNPACK_SKIP_ROWS,ti),T.pixelStorei(Q.UNPACK_SKIP_IMAGES,yt),Ae===0&&Z.generateMipmaps&&Q.generateMipmap(Be),T.unbindTexture()},this.initRenderTarget=function(A){he.get(A).__webglFramebuffer===void 0&&ge.setupRenderTarget(A)},this.initTexture=function(A){A.isCubeTexture?ge.setTextureCube(A,0):A.isData3DTexture?ge.setTexture3D(A,0):A.isDataArrayTexture||A.isCompressedArrayTexture?ge.setTexture2DArray(A,0):ge.setTexture2D(A,0),T.unbindTexture()},this.resetState=function(){ue=0,J=0,K=null,T.reset(),Oe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return mr}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=Tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=Tt._getUnpackColorSpace()}}const uP=/^[og]\s*(.+)?/,dP=/^mtllib /,hP=/^usemtl /,fP=/^usemap /,Zv=/\s+/,Jv=new te,Qf=new te,e_=new te,t_=new te,Li=new te,Bu=new gt;function pP(){const i={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(e,t){if(this.object&&this.object.fromDeclaration===!1){this.object.name=e,this.object.fromDeclaration=t!==!1;return}const r=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:e||"",fromDeclaration:t!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(a,l){const c=this._finalize(!1);c&&(c.inherited||c.groupCount<=0)&&this.materials.splice(c.index,1);const d={index:this.materials.length,name:a||"",mtllib:Array.isArray(l)&&l.length>0?l[l.length-1]:"",smooth:c!==void 0?c.smooth:this.smooth,groupStart:c!==void 0?c.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(h){const f={index:typeof h=="number"?h:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return f.clone=this.clone.bind(f),f}};return this.materials.push(d),d},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(a){const l=this.currentMaterial();if(l&&l.groupEnd===-1&&(l.groupEnd=this.geometry.vertices.length/3,l.groupCount=l.groupEnd-l.groupStart,l.inherited=!1),a&&this.materials.length>1)for(let c=this.materials.length-1;c>=0;c--)this.materials[c].groupCount<=0&&this.materials.splice(c,1);return a&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),l}},r&&r.name&&typeof r.clone=="function"){const a=r.clone(0);a.inherited=!0,this.object.materials.push(a)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseNormalIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/3)*3},parseUVIndex:function(e,t){const r=parseInt(e,10);return(r>=0?r-1:r+t/2)*2},addVertex:function(e,t,r){const a=this.vertices,l=this.object.geometry.vertices;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addVertexPoint:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addVertexLine:function(e){const t=this.vertices;this.object.geometry.vertices.push(t[e+0],t[e+1],t[e+2])},addNormal:function(e,t,r){const a=this.normals,l=this.object.geometry.normals;l.push(a[e+0],a[e+1],a[e+2]),l.push(a[t+0],a[t+1],a[t+2]),l.push(a[r+0],a[r+1],a[r+2])},addFaceNormal:function(e,t,r){const a=this.vertices,l=this.object.geometry.normals;Jv.fromArray(a,e),Qf.fromArray(a,t),e_.fromArray(a,r),Li.subVectors(e_,Qf),t_.subVectors(Jv,Qf),Li.cross(t_),Li.normalize(),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z),l.push(Li.x,Li.y,Li.z)},addColor:function(e,t,r){const a=this.colors,l=this.object.geometry.colors;a[e]!==void 0&&l.push(a[e+0],a[e+1],a[e+2]),a[t]!==void 0&&l.push(a[t+0],a[t+1],a[t+2]),a[r]!==void 0&&l.push(a[r+0],a[r+1],a[r+2])},addUV:function(e,t,r){const a=this.uvs,l=this.object.geometry.uvs;l.push(a[e+0],a[e+1]),l.push(a[t+0],a[t+1]),l.push(a[r+0],a[r+1])},addDefaultUV:function(){const e=this.object.geometry.uvs;e.push(0,0),e.push(0,0),e.push(0,0)},addUVLine:function(e){const t=this.uvs;this.object.geometry.uvs.push(t[e+0],t[e+1])},addFace:function(e,t,r,a,l,c,d,h,f){const g=this.vertices.length;let p=this.parseVertexIndex(e,g),v=this.parseVertexIndex(t,g),_=this.parseVertexIndex(r,g);if(this.addVertex(p,v,_),this.addColor(p,v,_),d!==void 0&&d!==""){const E=this.normals.length;p=this.parseNormalIndex(d,E),v=this.parseNormalIndex(h,E),_=this.parseNormalIndex(f,E),this.addNormal(p,v,_)}else this.addFaceNormal(p,v,_);if(a!==void 0&&a!==""){const E=this.uvs.length;p=this.parseUVIndex(a,E),v=this.parseUVIndex(l,E),_=this.parseUVIndex(c,E),this.addUV(p,v,_),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(e){this.object.geometry.type="Points";const t=this.vertices.length;for(let r=0,a=e.length;r<a;r++){const l=this.parseVertexIndex(e[r],t);this.addVertexPoint(l),this.addColor(l)}},addLineGeometry:function(e,t){this.object.geometry.type="Line";const r=this.vertices.length,a=this.uvs.length;for(let l=0,c=e.length;l<c;l++)this.addVertexLine(this.parseVertexIndex(e[l],r));for(let l=0,c=t.length;l<c;l++)this.addUVLine(this.parseUVIndex(t[l],a))}};return i.startObject("",!1),i}class mP extends sc{constructor(e){super(e),this.materials=null}load(e,t,r,a){const l=this,c=new rT(this.manager);c.setPath(this.path),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(d){try{t(l.parse(d))}catch(h){a?a(h):console.error(h),l.manager.itemError(e)}},r,a)}setMaterials(e){return this.materials=e,this}parse(e){const t=new pP;e.indexOf(`\r
`)!==-1&&(e=e.replace(/\r\n/g,`
`)),e.indexOf(`\\
`)!==-1&&(e=e.replace(/\\\n/g,""));const r=e.split(`
`);let a=[];for(let d=0,h=r.length;d<h;d++){const f=r[d].trimStart();if(f.length===0)continue;const g=f.charAt(0);if(g!=="#")if(g==="v"){const p=f.split(Zv);switch(p[0]){case"v":t.vertices.push(parseFloat(p[1]),parseFloat(p[2]),parseFloat(p[3])),p.length>=7?(Bu.setRGB(parseFloat(p[4]),parseFloat(p[5]),parseFloat(p[6]),Jn),t.colors.push(Bu.r,Bu.g,Bu.b)):t.colors.push(void 0,void 0,void 0);break;case"vn":t.normals.push(parseFloat(p[1]),parseFloat(p[2]),parseFloat(p[3]));break;case"vt":t.uvs.push(parseFloat(p[1]),parseFloat(p[2]));break}}else if(g==="f"){const v=f.slice(1).trim().split(Zv),_=[];for(let b=0,M=v.length;b<M;b++){const S=v[b];if(S.length>0){const P=S.split("/");_.push(P)}}const E=_[0];for(let b=1,M=_.length-1;b<M;b++){const S=_[b],P=_[b+1];t.addFace(E[0],S[0],P[0],E[1],S[1],P[1],E[2],S[2],P[2])}}else if(g==="l"){const p=f.substring(1).trim().split(" ");let v=[];const _=[];if(f.indexOf("/")===-1)v=p;else for(let E=0,b=p.length;E<b;E++){const M=p[E].split("/");M[0]!==""&&v.push(M[0]),M[1]!==""&&_.push(M[1])}t.addLineGeometry(v,_)}else if(g==="p"){const v=f.slice(1).trim().split(" ");t.addPointGeometry(v)}else if((a=uP.exec(f))!==null){const p=(" "+a[0].slice(1).trim()).slice(1);t.startObject(p)}else if(hP.test(f))t.object.startMaterial(f.substring(7).trim(),t.materialLibraries);else if(dP.test(f))t.materialLibraries.push(f.substring(7).trim());else if(fP.test(f))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(g==="s"){if(a=f.split(" "),a.length>1){const v=a[1].trim().toLowerCase();t.object.smooth=v!=="0"&&v!=="off"}else t.object.smooth=!0;const p=t.object.currentMaterial();p&&(p.smooth=t.object.smooth)}else{if(f==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+f+'"')}}t.finalize();const l=new Ol;if(l.materialLibraries=[].concat(t.materialLibraries),!(t.objects.length===1&&t.objects[0].geometry.vertices.length===0)===!0)for(let d=0,h=t.objects.length;d<h;d++){const f=t.objects[d],g=f.geometry,p=f.materials,v=g.type==="Line",_=g.type==="Points";let E=!1;if(g.vertices.length===0)continue;const b=new Mi;b.setAttribute("position",new In(g.vertices,3)),g.normals.length>0&&b.setAttribute("normal",new In(g.normals,3)),g.colors.length>0&&(E=!0,b.setAttribute("color",new In(g.colors,3))),g.hasUVIndices===!0&&b.setAttribute("uv",new In(g.uvs,2));const M=[];for(let P=0,L=p.length;P<L;P++){const C=p[P],I=C.name+"_"+C.smooth+"_"+E;let N=t.materials[I];if(this.materials!==null){if(N=this.materials.create(C.name),v&&N&&!(N instanceof Qu)){const U=new Qu;Sr.prototype.copy.call(U,N),U.color.copy(N.color),N=U}else if(_&&N&&!(N instanceof kl)){const U=new kl({size:10,sizeAttenuation:!1});Sr.prototype.copy.call(U,N),U.color.copy(N.color),U.map=N.map,N=U}}N===void 0&&(v?N=new Qu:_?N=new kl({size:1,sizeAttenuation:!1}):N=new Zb,N.name=C.name,N.flatShading=!C.smooth,N.vertexColors=E,t.materials[I]=N),M.push(N)}let S;if(M.length>1){for(let P=0,L=p.length;P<L;P++){const C=p[P];b.addGroup(C.groupStart,C.groupCount,P)}v?S=new xv(b,M):_?S=new Hf(b,M):S=new Qi(b,M)}else v?S=new xv(b,M[0]):_?S=new Hf(b,M[0]):S=new Qi(b,M[0]);S.name=f.name,l.add(S)}else if(t.vertices.length>0){const d=new kl({size:1,sizeAttenuation:!1}),h=new Mi;h.setAttribute("position",new In(t.vertices,3)),t.colors.length>0&&t.colors[0]!==void 0&&(h.setAttribute("color",new In(t.colors,3)),d.vertexColors=!0);const f=new Hf(h,d);l.add(f)}return l}}const n_={type:"change"},Gm={type:"start"},zy={type:"end"},Hu=new yd,i_=new ws,gP=Math.cos(70*Sb.DEG2RAD),yn=new te,ci=2*Math.PI,jt={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Zf=1e-6;class xP extends fT{constructor(e,t=null){super(e,t),this.state=jt.NONE,this.target=new te,this.cursor=new te,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:mo.ROTATE,MIDDLE:mo.DOLLY,RIGHT:mo.PAN},this.touches={ONE:fo.ROTATE,TWO:fo.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new te,this._lastQuaternion=new ks,this._lastTargetPosition=new te,this._quat=new ks().setFromUnitVectors(e.up,new te(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new Tv,this._sphericalDelta=new Tv,this._scale=1,this._panOffset=new te,this._rotateStart=new ut,this._rotateEnd=new ut,this._rotateDelta=new ut,this._panStart=new ut,this._panEnd=new ut,this._panDelta=new ut,this._dollyStart=new ut,this._dollyEnd=new ut,this._dollyDelta=new ut,this._dollyDirection=new te,this._mouse=new ut,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=_P.bind(this),this._onPointerDown=vP.bind(this),this._onPointerUp=yP.bind(this),this._onContextMenu=CP.bind(this),this._onMouseWheel=EP.bind(this),this._onKeyDown=wP.bind(this),this._onTouchStart=bP.bind(this),this._onTouchMove=TP.bind(this),this._onMouseDown=SP.bind(this),this._onMouseMove=MP.bind(this),this._interceptControlDown=RP.bind(this),this._interceptControlUp=AP.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(e){this._cursorStyle=e,e==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction=""}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(n_),this.update(),this.state=jt.NONE}pan(e,t){this._pan(e,t),this.update()}dollyIn(e){this._dollyIn(e),this.update()}dollyOut(e){this._dollyOut(e),this.update()}rotateLeft(e){this._rotateLeft(e),this.update()}rotateUp(e){this._rotateUp(e),this.update()}update(e=null){const t=this.object.position;yn.copy(t).sub(this.target),yn.applyQuaternion(this._quat),this._spherical.setFromVector3(yn),this.autoRotate&&this.state===jt.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let r=this.minAzimuthAngle,a=this.maxAzimuthAngle;isFinite(r)&&isFinite(a)&&(r<-Math.PI?r+=ci:r>Math.PI&&(r-=ci),a<-Math.PI?a+=ci:a>Math.PI&&(a-=ci),r<=a?this._spherical.theta=Math.max(r,Math.min(a,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(r+a)/2?Math.max(r,this._spherical.theta):Math.min(a,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let l=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const c=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),l=c!=this._spherical.radius}if(yn.setFromSpherical(this._spherical),yn.applyQuaternion(this._quatInverse),t.copy(this.target).add(yn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let c=null;if(this.object.isPerspectiveCamera){const d=yn.length();c=this._clampDistance(d*this._scale);const h=d-c;this.object.position.addScaledVector(this._dollyDirection,h),this.object.updateMatrixWorld(),l=!!h}else if(this.object.isOrthographicCamera){const d=new te(this._mouse.x,this._mouse.y,0);d.unproject(this.object);const h=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),l=h!==this.object.zoom;const f=new te(this._mouse.x,this._mouse.y,0);f.unproject(this.object),this.object.position.sub(f).add(d),this.object.updateMatrixWorld(),c=yn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;c!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(c).add(this.object.position):(Hu.origin.copy(this.object.position),Hu.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Hu.direction))<gP?this.object.lookAt(this.target):(i_.setFromNormalAndCoplanarPoint(this.object.up,this.target),Hu.intersectPlane(i_,this.target))))}else if(this.object.isOrthographicCamera){const c=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),c!==this.object.zoom&&(this.object.updateProjectionMatrix(),l=!0)}return this._scale=1,this._performCursorZoom=!1,l||this._lastPosition.distanceToSquared(this.object.position)>Zf||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Zf||this._lastTargetPosition.distanceToSquared(this.target)>Zf?(this.dispatchEvent(n_),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ci/60*this.autoRotateSpeed*e:ci/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){yn.setFromMatrixColumn(t,0),yn.multiplyScalar(-e),this._panOffset.add(yn)}_panUp(e,t){this.screenSpacePanning===!0?yn.setFromMatrixColumn(t,1):(yn.setFromMatrixColumn(t,0),yn.crossVectors(this.object.up,yn)),yn.multiplyScalar(e),this._panOffset.add(yn)}_pan(e,t){const r=this.domElement;if(this.object.isPerspectiveCamera){const a=this.object.position;yn.copy(a).sub(this.target);let l=yn.length();l*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*l/r.clientHeight,this.object.matrix),this._panUp(2*t*l/r.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/r.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/r.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const r=this.domElement.getBoundingClientRect(),a=e-r.left,l=t-r.top,c=r.width,d=r.height;this._mouse.x=a/c*2-1,this._mouse.y=-(l/d)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ci*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._rotateStart.set(r,a)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panStart.set(r,a)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyStart.set(0,l)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const r=this._getSecondPointerPosition(e),a=.5*(e.pageX+r.x),l=.5*(e.pageY+r.y);this._rotateEnd.set(a,l)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ci*this._rotateDelta.x/t.clientHeight),this._rotateUp(ci*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),r=.5*(e.pageX+t.x),a=.5*(e.pageY+t.y);this._panEnd.set(r,a)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),r=e.pageX-t.x,a=e.pageY-t.y,l=Math.sqrt(r*r+a*a);this._dollyEnd.set(0,l),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const c=(e.pageX+t.x)*.5,d=(e.pageY+t.y)*.5;this._updateZoomParameters(c,d)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ut,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,r={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:r.deltaY*=16;break;case 2:r.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(r.deltaY*=10),r}}function vP(i){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(i.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(i)&&(this._addPointer(i),i.pointerType==="touch"?this._onTouchStart(i):this._onMouseDown(i),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function _P(i){this.enabled!==!1&&(i.pointerType==="touch"?this._onTouchMove(i):this._onMouseMove(i))}function yP(i){switch(this._removePointer(i),this._pointers.length){case 0:this.domElement.releasePointerCapture(i.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(zy),this.state=jt.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function SP(i){let e;switch(i.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case mo.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(i),this.state=jt.DOLLY;break;case mo.ROTATE:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=jt.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=jt.ROTATE}break;case mo.PAN:if(i.ctrlKey||i.metaKey||i.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(i),this.state=jt.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(i),this.state=jt.PAN}break;default:this.state=jt.NONE}this.state!==jt.NONE&&this.dispatchEvent(Gm)}function MP(i){switch(this.state){case jt.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(i);break;case jt.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(i);break;case jt.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(i);break}}function EP(i){this.enabled===!1||this.enableZoom===!1||this.state!==jt.NONE||(i.preventDefault(),this.dispatchEvent(Gm),this._handleMouseWheel(this._customWheelEvent(i)),this.dispatchEvent(zy))}function wP(i){this.enabled!==!1&&this._handleKeyDown(i)}function bP(i){switch(this._trackPointer(i),this._pointers.length){case 1:switch(this.touches.ONE){case fo.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(i),this.state=jt.TOUCH_ROTATE;break;case fo.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(i),this.state=jt.TOUCH_PAN;break;default:this.state=jt.NONE}break;case 2:switch(this.touches.TWO){case fo.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(i),this.state=jt.TOUCH_DOLLY_PAN;break;case fo.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(i),this.state=jt.TOUCH_DOLLY_ROTATE;break;default:this.state=jt.NONE}break;default:this.state=jt.NONE}this.state!==jt.NONE&&this.dispatchEvent(Gm)}function TP(i){switch(this._trackPointer(i),this.state){case jt.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(i),this.update();break;case jt.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(i),this.update();break;case jt.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(i),this.update();break;case jt.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(i),this.update();break;default:this.state=jt.NONE}}function CP(i){this.enabled!==!1&&i.preventDefault()}function RP(i){i.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function AP(i){i.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function PP({piece:i,textured:e=!0,size:t=320}){const r=k.useRef(null);return k.useEffect(()=>{const a=r.current;if(!a)return;const l=new Ub;l.background=new gt(1315866);const c=new Ii(35,1,.01,5e3),d=new cP({antialias:!0});d.setSize(t,t),d.setPixelRatio(Math.min(2,window.devicePixelRatio)),d.outputColorSpace=Jn,d.toneMapping=Pm,d.toneMappingExposure=1.15,a.appendChild(d.domElement),l.add(new oT(16777215,4210768,1.1)),l.add(new uT(16777215,.35));const h=new jf(16777215,2.4);h.position.set(3,4,2),l.add(h);const f=new jf(16777215,1.1);f.position.set(-3,1,-1),l.add(f);const g=new jf(16777215,.8);g.position.set(0,2,-4),l.add(g);const p=new xP(c,d.domElement);p.enableDamping=!0,p.autoRotate=!0,p.autoRotateSpeed=1.2;let v=0,_=!1;new mP().load(`/api/scan/model/${i}.obj`,M=>{if(_)return;M.traverse(N=>{const U=N;U.isMesh&&U.geometry.computeVertexNormals()});const S=N=>NP(M,N);e?new aT().load(`/api/scan/model/${i}.png`,N=>{N.colorSpace=Jn,S(new Vf({map:N,roughness:.6}))},void 0,()=>S(new Vf({color:11579576,roughness:.6}))):S(new Vf({color:12632262,roughness:.65})),M.rotation.x=-Math.PI/2;const P=new Vo().setFromObject(M),L=P.getCenter(new te),C=P.getSize(new te);M.position.sub(L),l.add(M);const I=Math.max(C.x,C.y,C.z);c.position.set(I*1.6,I*.6,I*1.6),c.near=I/100,c.far=I*100,c.updateProjectionMatrix(),p.target.set(0,0,0),p.update()});const b=()=>{p.update(),d.render(l,c),v=requestAnimationFrame(b)};return b(),()=>{_=!0,cancelAnimationFrame(v),p.dispose(),d.dispose(),a.removeChild(d.domElement)}},[i,e,t]),x.jsx("div",{ref:r,style:{width:t,height:t},className:"rounded-lg border border-zinc-700 bg-zinc-950 [&>canvas]:rounded-lg"})}function NP(i,e){e.side=hr,i.traverse(t=>{t.isMesh&&(t.material=e)})}const LP="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-sky-500",DP={P:"Bauer",N:"Springer",B:"Läufer",R:"Turm",Q:"Dame",K:"König"};function IP(i){const e=i.match(/^([wb]?)([PNBRQK])$/i);if(!e)return null;const t=e[2].toUpperCase();return e[1]?e[1].toLowerCase()+t:t}function dd(i){const e=i.length===2?i[1]:i[0];let t="";return i.length===2&&(t=i[0]==="w"?"weiß ":"schwarz "),t+(DP[e]??i)}function cm(i,e){const t=IP(i.dir),r=e.find(a=>a.source_dir===i.dir)??(t?e.find(a=>a.piece.toLowerCase()===t.toLowerCase()&&!a.source_dir):void 0);return r?{stage:"done",piece:r.piece}:i.mesh?{stage:"mesh",piece:t}:{stage:"mesh",piece:t}}function UP(){const[i,e]=k.useState(null),[t,r]=k.useState(""),[a,l]=k.useState("P"),[c,d]=k.useState(null),[h,f]=k.useState(""),[g,p]=k.useState("textured"),[v,_]=k.useState(null),[E,b]=k.useState(null),[M,S]=k.useState(null),[P,L]=k.useState(""),[C,I]=k.useState(!1),N=k.useRef(null),U=()=>qt("/api/scan/models").then(F=>{e(F),!t&&F.scans.length&&w(F.scans[0],F.pieces)}).catch(()=>{});function w(F,ee=(i==null?void 0:i.pieces)??[]){r(F.dir);const{piece:Ce}=cm(F,ee);l(Ce??"P")}async function D(F){confirm(`Scan „${F}" mit Mesh wirklich löschen?`)&&(await jl(`/api/scan/scan/${F}`).catch(()=>{}),t===F&&r(""),U())}async function z(F){confirm(`Vorbereitete Figur „${F}" löschen? (Der Scan bleibt erhalten.)`)&&(await jl(`/api/scan/piece/${F}`).catch(()=>{}),d(null),U())}async function H(){var F;if(!(!E||!P)){I(!0),f("");try{const ee=new FormData;ee.append("name",P),ee.append("mesh",E),M&&ee.append("texture",M);const Ce=await fetch("/api/scan/upload",{method:"POST",body:ee});if(!Ce.ok)throw new Error(((F=await Ce.json())==null?void 0:F.detail)||`HTTP ${Ce.status}`);await U(),r(P),L(""),b(null),S(null)}catch(ee){f("Upload: "+ee.message)}I(!1)}}const X=()=>qt("/api/scan/prepare/status").then(F=>{d(F),F.state!=="running"&&(clearInterval(N.current),U())}).catch(()=>{});k.useEffect(()=>(U(),qt("/api/scan/prepare/status").then(F=>{F.state==="running"&&(d(F),N.current=setInterval(X,2e3))}).catch(()=>{}),()=>{clearInterval(N.current)}),[]);async function j(){f("");try{await Wt("/api/scan/prepare",{dir:t,piece:a}),d({state:"running",piece:a}),clearInterval(N.current),N.current=setInterval(X,2e3)}catch(F){f("Fehler: "+F.message)}}const le=(i==null?void 0:i.scans)??[],$=le.find(F=>F.dir===t),ue=$?cm($,(i==null?void 0:i.pieces)??[]):null,J=ue==null?void 0:ue.stage,K=(c==null?void 0:c.state)==="running",re=J==="done"?2:1;let de;return K?de="läuft…":J==="done"?de="Neu vorbereiten":de="Vorbereiten",(ue==null?void 0:ue.stage)==="done"?ue.piece:(c==null?void 0:c.state)==="done"&&c.piece,x.jsxs("div",{className:"space-y-4",children:[x.jsxs(Ht,{title:"Figuren-Werkstatt — 3D-Scan → Figur",children:[x.jsx("div",{className:"mb-4 flex items-center gap-1 text-xs",children:[[1,"Upload",ny],[2,"Vorbereiten",xp]].map(([F,ee,Ce],Ve)=>x.jsxs("div",{className:"flex items-center gap-1",children:[x.jsxs("div",{className:`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${re>=F?"bg-sky-500/15 text-sky-300":"bg-zinc-800 text-zinc-500"}`,children:[x.jsx(Ce,{className:"h-3.5 w-3.5"})," ",x.jsx("span",{children:ee})]}),Ve<1&&x.jsx("div",{className:`h-px w-4 ${re>F?"bg-sky-500/40":"bg-zinc-700"}`})]},F))}),le.length===0&&x.jsx("p",{className:"text-sm text-zinc-500",children:"Noch keine Scans. Lade ein 3D-Modell (.obj/.glb) hoch — es erscheint dann hier als Karte."}),x.jsx(FP,{uploadName:P,setUploadName:L,meshFile:E,setMeshFile:b,texFile:M,setTexFile:S,uploading:C,doUpload:H,input:LP}),x.jsx(OP,{scans:le,models:i,dir:t,selectScan:w,deleteScan:D,prep:c}),$&&x.jsxs("div",{className:"mt-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4",children:[x.jsxs("div",{className:"mb-3 flex items-center justify-between",children:[x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsxs("div",{children:[x.jsx("div",{className:"text-sm font-medium text-zinc-100",children:$.dir}),x.jsxs("div",{className:"text-xs text-zinc-500",children:[$.mesh?"Mesh vorhanden":"noch kein Mesh",!$.texture&&$.mesh?" · ⚠ ohne Textur":""]})]}),x.jsx("button",{onClick:()=>D($.dir),title:"Scan löschen",className:"rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400",children:x.jsx(Ho,{className:"h-4 w-4"})})]}),x.jsxs(wt,{variant:"primary",onClick:j,disabled:K,children:[K?x.jsx(ba,{className:"h-4 w-4 animate-spin"}):x.jsx(xp,{className:"h-4 w-4"}),de]})]}),x.jsx(zP,{cur:$,busyPrep:K,prep:c}),h&&x.jsx("p",{className:"mt-2 text-sm text-red-400",children:h})]}),x.jsx(BP,{pieces:i==null?void 0:i.pieces,setView3d:_,deletePiece:z,prep:c,variant:g,setVariant:p})]}),v&&x.jsx(kP,{piece:v,textured:g==="textured",onClose:()=>_(null)})]})}function FP({uploadName:i,setUploadName:e,meshFile:t,setMeshFile:r,texFile:a,setTexFile:l,uploading:c,doUpload:d,input:h}){return x.jsxs("div",{className:"mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3",children:[x.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"3D-Modell hochladen (.obj/.glb)"}),x.jsxs("div",{className:"flex flex-wrap items-end gap-3",children:[x.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Name",x.jsx("input",{value:i,onChange:f=>e(f.target.value),placeholder:"z.B. wK",className:`${h} w-32`})]}),x.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Mesh (.obj/.glb)",x.jsx("input",{type:"file",accept:".obj,.glb,.gltf",onChange:f=>{var g;return r(((g=f.target.files)==null?void 0:g[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),x.jsxs("label",{className:"flex flex-col gap-1 text-xs text-zinc-500",children:["Textur (optional)",x.jsx("input",{type:"file",accept:".png,.jpg,.jpeg",onChange:f=>{var g;return l(((g=f.target.files)==null?void 0:g[0])??null)},className:"text-xs text-zinc-300 file:mr-1 file:rounded file:border-0 file:bg-zinc-700 file:px-2 file:py-0.5 file:text-xs file:text-zinc-200"})]}),x.jsxs(wt,{variant:"primary",onClick:d,disabled:c||!t||!i,children:[c?x.jsx(ba,{className:"h-4 w-4 animate-spin"}):x.jsx(ny,{className:"h-4 w-4"}),"Hochladen"]})]})]})}function OP({scans:i,models:e,dir:t,selectScan:r,deleteScan:a,prep:l}){return x.jsx("div",{className:"grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var _;const d=cm(c,(e==null?void 0:e.pieces)??[]),h=c.dir===t,g=(l==null?void 0:l.state)==="running"&&l.dir===c.dir||((_=e==null?void 0:e.jobs)==null?void 0:_.prepare)===c.dir,p=g?["wird vorbereitet…","bg-sky-500/20 text-sky-300"]:{mesh:["Mesh bereit","bg-sky-500/15 text-sky-300"],done:["Fertig","bg-green-500/15 text-green-300"]}[d.stage],v=d.piece&&d.stage==="done";return x.jsxs("div",{onClick:()=>r(c),role:"button",tabIndex:0,onKeyDown:E=>{(E.key==="Enter"||E.key===" ")&&(E.preventDefault(),r(c))},className:`group relative flex cursor-pointer flex-col rounded-xl border p-2 text-left transition ${h?"border-sky-500 bg-sky-500/5":"border-zinc-800 hover:border-zinc-600"}`,children:[x.jsxs("div",{className:"relative mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[v?x.jsx("img",{src:`/api/scan/prepare/preview/${d.piece}`,alt:`${dd(d.piece)} Vorschau`,className:"h-full w-full object-contain"}):x.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:x.jsx(K_,{className:"h-8 w-8"})}),x.jsxs("span",{className:`absolute left-1 top-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${p[1]}`,children:[g&&x.jsx(ba,{className:"h-3 w-3 animate-spin"}),p[0]]}),x.jsx("button",{onClick:E=>{E.stopPropagation(),a(c.dir)},title:"Scan-Ordner löschen",className:"absolute right-1 top-1 hidden rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-red-400 group-hover:block",children:x.jsx(Ho,{className:"h-3.5 w-3.5"})})]}),x.jsx("div",{className:"text-sm font-medium text-zinc-200",children:c.dir}),x.jsx("div",{className:"text-[11px] text-zinc-500",children:d.piece?` · ${dd(d.piece)}`:""})]},c.dir)})})}function kP({piece:i,textured:e,onClose:t}){const[r,a]=k.useState(e);return k.useEffect(()=>{const l=c=>c.key==="Escape"&&t();return window.addEventListener("keydown",l),()=>window.removeEventListener("keydown",l)},[t]),x.jsx("div",{onClick:t,role:"button",tabIndex:0,onKeyDown:l=>{(l.key==="Enter"||l.key===" ")&&(l.preventDefault(),t())},className:"fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 p-6",children:x.jsxs("div",{onClick:l=>l.stopPropagation(),role:"presentation",onKeyDown:l=>l.stopPropagation(),className:"flex flex-col items-center gap-3",children:[x.jsx(PP,{piece:i,textured:r,size:Math.min(720,window.innerHeight-160)}),x.jsxs("div",{className:"flex items-center gap-3 text-sm text-zinc-300",children:[x.jsx("span",{className:"font-medium",children:i}),x.jsx(By,{value:r?"textured":"clay",onChange:l=>a(l==="textured")}),x.jsx("span",{className:"text-xs text-zinc-500",children:"ziehen = drehen · Rad = zoomen · Esc = schließen"})]})]})})}function zP({cur:i,busyPrep:e,prep:t}){return x.jsxs(x.Fragment,{children:[e&&x.jsxs("div",{className:"flex items-center gap-2 rounded-lg bg-sky-500/10 p-3 text-sm text-sky-300",children:[x.jsx(ba,{className:"h-4 w-4 animate-spin"})," Bereite Figur vor (upright + OBJ + Preview) — ca. 10–60 s…"]}),(t==null?void 0:t.state)==="failed"&&x.jsxs("div",{className:"rounded-lg bg-red-500/10 p-3 text-sm text-red-300",children:[x.jsxs("div",{className:"flex items-center gap-2",children:[x.jsx(Cm,{className:"h-4 w-4"})," Vorbereitung fehlgeschlagen."]}),t.log_tail&&x.jsx("pre",{className:"mt-1 whitespace-pre-wrap text-xs text-red-400/70",children:t.log_tail})]})]})}function BP({pieces:i,setView3d:e,deletePiece:t,prep:r,variant:a,setVariant:l}){return i!=null&&i.length?x.jsxs("div",{className:"mt-4 border-t border-zinc-800 pt-3",children:[x.jsx("div",{className:"mb-2 text-xs font-medium text-zinc-400",children:"Fertige Figuren (synth_pieces/)"}),x.jsx("div",{className:"grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",children:i.map(c=>{var h,f;const d=(r==null?void 0:r.state)==="running"&&r.piece===c.piece;return x.jsxs("div",{className:"relative rounded-xl border border-zinc-800 bg-zinc-900/50 p-2",children:[x.jsxs("div",{className:"relative mb-2 aspect-square overflow-hidden rounded-lg bg-zinc-950",children:[c.has_preview?x.jsx("img",{src:`/api/scan/prepare/preview/${c.piece}${a==="clay"?"?variant=clay":""}`,alt:`${dd(c.piece)}`,className:"h-full w-full object-contain"}):x.jsx("div",{className:"grid h-full place-items-center text-zinc-700",children:x.jsx(hw,{className:"h-8 w-8"})}),x.jsx("button",{onClick:()=>e(c.piece),title:"3D-Ansicht öffnen",className:"absolute right-1 top-1 rounded bg-zinc-900/80 p-1 text-zinc-400 hover:text-white",children:x.jsx(pw,{className:"h-3.5 w-3.5"})})]}),x.jsxs("div",{className:"flex items-center justify-between",children:[x.jsx("span",{className:"text-sm font-medium text-zinc-200",children:dd(c.piece)}),d&&x.jsx(ba,{className:"h-3.5 w-3.5 animate-spin text-sky-400"})]}),x.jsx(By,{value:a,onChange:l,clayDisabled:!c.has_clay}),c.report&&x.jsx(HP,{piece:c.piece,report:c.report,level:(h=c.report)==null?void 0:h.level,messages:(f=c.report)==null?void 0:f.messages,onDelete:t})]},c.piece)})})]}):null}function HP({piece:i,report:e,level:t,messages:r,onDelete:a}){return!e||!e.tris?null:x.jsxs("div",{className:"mt-2 rounded-lg bg-zinc-800 p-2 text-[11px] text-zinc-400",children:[t&&x.jsxs("div",{className:`mb-1 flex items-center gap-1 font-medium ${t==="ok"?"text-green-400":"text-amber-400"}`,children:[t==="ok"?x.jsx(vd,{className:"h-4 w-4"}):x.jsx(Cm,{className:"h-4 w-4"}),t==="ok"?"Qualität OK":"Bitte prüfen"]}),(r??[]).map((l,c)=>x.jsxs("div",{className:"text-amber-300/90",children:["• ",l]},c)),x.jsxs("div",{className:"grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-1",children:[x.jsx("span",{className:"text-zinc-500",children:"Dreiecke"}),x.jsx("span",{children:e.tris}),x.jsx("span",{className:"text-zinc-500",children:"offene Kanten"}),x.jsx("span",{children:e.boundary_edges}),x.jsx("span",{className:"text-zinc-500",children:"Höhe/Basis"}),x.jsx("span",{children:e.height_ratio})]}),x.jsxs("div",{className:"pt-1 text-zinc-500",children:["→ synth_pieces/",i,".obj"]}),x.jsxs("button",{onClick:()=>a(i),className:"mt-1 flex items-center gap-1 text-red-400/80 hover:text-red-400",children:[x.jsx(Ho,{className:"h-3.5 w-3.5"})," Figur löschen"]})]})}function By({value:i,onChange:e,clayDisabled:t}){return x.jsxs("div",{className:"mt-2 flex overflow-hidden rounded-lg border border-zinc-700 text-xs",children:[x.jsx("button",{onClick:()=>e("textured"),className:`px-3 py-1 ${i==="textured"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"}`,children:"Textur"}),x.jsx("button",{onClick:()=>e("clay"),disabled:t,title:t?"kein Clay-Bild (Figur vor diesem Update vorbereitet)":"reine Geometrie",className:`px-3 py-1 ${i==="clay"?"bg-sky-600 text-white":"text-zinc-400 hover:bg-zinc-700"} ${t?"cursor-not-allowed opacity-40":""}`,children:"Clay"})]})}const VP=[{to:"/kalibrieren",label:"Kalibrieren",icon:ow},{to:"/sammeln",label:"Sammeln",icon:Lo},{to:"/scan",label:"Scan",icon:K_},{to:"/manuell",label:"Manuell labeln",icon:dw},{to:"/datensaetze",label:"Datensätze",icon:cw},{to:"/inference",label:"Inference",icon:Z_},{to:"/review",label:"Review / Relabel",icon:xw},{to:"/training",label:"Training",icon:iw}],GP=({isActive:i})=>`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${i?"bg-zinc-800 text-zinc-100":"text-zinc-400 hover:text-zinc-100"}`;function jP(){return x.jsx(B1,{children:x.jsxs("div",{className:"min-h-full",children:[x.jsx("header",{className:"sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur",children:x.jsxs("div",{className:"mx-auto flex max-w-7xl items-center gap-6 px-5 py-3",children:[x.jsxs("div",{className:"flex items-center gap-2 font-semibold tracking-tight",children:[x.jsx(lw,{className:"h-5 w-5 text-sky-400"})," chesslab"]}),x.jsx("nav",{className:"flex flex-wrap gap-1",children:VP.map(i=>{const e=i.icon;return x.jsxs(po,{to:i.to,className:GP,children:[x.jsx(e,{className:"h-4 w-4"})," ",i.label]},i.to)})})]})}),x.jsx("main",{className:"mx-auto max-w-7xl px-5 py-6",children:x.jsxs(m1,{children:[x.jsx(Kn,{path:"/",element:x.jsx(uf,{to:"/kalibrieren",replace:!0})}),x.jsx(Kn,{path:"/kalibrieren",element:x.jsx(Sw,{})}),x.jsx(Kn,{path:"/sammeln",element:x.jsx(Ew,{})}),x.jsx(Kn,{path:"/scan",element:x.jsx(UP,{})}),x.jsx(Kn,{path:"/manuell",element:x.jsx(Rw,{})}),x.jsxs(Kn,{path:"/datensaetze",element:x.jsx(Aw,{}),children:[x.jsx(Kn,{index:!0,element:x.jsx(uf,{to:"sessions",replace:!0})}),x.jsx(Kn,{path:"sessions",element:x.jsx(Pw,{})}),x.jsx(Kn,{path:"kuratiert",element:x.jsx(Nw,{})}),x.jsx(Kn,{path:"statistik",element:x.jsx(Lw,{})})]}),x.jsx(Kn,{path:"/inference",element:x.jsx(Ow,{})}),x.jsx(Kn,{path:"/review",element:x.jsx(Uw,{})}),x.jsx(Kn,{path:"/training",element:x.jsx(Fw,{})}),x.jsx(Kn,{path:"*",element:x.jsx(uf,{to:"/kalibrieren",replace:!0})})]})})]})})}const WP=new tE({defaultOptions:{queries:{staleTime:0,refetchOnWindowFocus:!0,refetchOnMount:"always",retry:1}}});AM.createRoot(document.getElementById("root")).render(x.jsx(EM.StrictMode,{children:x.jsx(nE,{client:WP,children:x.jsx(jP,{})})}));
