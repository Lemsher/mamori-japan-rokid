// Studio's side-panel text field supplies SpeechRecognition results. The Ink
// canvas itself intentionally does not receive desktop typing in that host.
export function startTextInput(onText,onError,onEnd,Recognition=globalThis.SpeechRecognition){
  if(typeof Recognition!=='function'){onError(new Error('speech-unsupported'));return null;}
  const recognition=new Recognition();
  recognition.onresult=e=>{const text=e?.results?.[0]?.[0]?.transcript;if(typeof text==='string'&&text.trim())onText(text.trim());};
  recognition.onerror=e=>onError(e);
  recognition.onend=onEnd;
  try{recognition.start();return recognition;}catch(e){onError(e);return null;}
}
