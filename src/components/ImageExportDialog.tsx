import React, { useEffect, useRef, useState } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { ActionsManagerInterface } from "../actions/types";
import { probablySupportsClipboardBlob } from "../clipboard";
import { canvasToBlob } from "../data/blob";
import { NonDeletedExcalidrawElement } from "../element/types";
import { CanvasError } from "../errors";
import { t } from "../i18n";
import { useIsMobile } from "./App";
import { getSelectedElements, isSomeElementSelected } from "../scene";
import { exportToCanvas } from "../scene/export";
import { AppState } from "../types";
import { Dialog } from "./Dialog";
import { clipboard, exportImage } from "./icons";
import Stack from "./Stack";
import { ToolButton } from "./ToolButton";
import "./ExportDialog.scss";
import { supported as fsSupported } from "browser-fs-access";
import OpenColor from "open-color";
import { CheckboxItem } from "./CheckboxItem";
import { DEFAULT_EXPORT_PADDING } from "../constants";
import {storage} from "../../src/firebase/index"
import { register } from "../actions/register";
import { newElementWith } from "../element/mutateElement";
import { getDefaultAppState } from "../appState";
import { trash, zoomIn, zoomOut } from "../components/icons";
import ListImages from "../components/ListImages"
const supportsContextFilters =
  "filter" in document.createElement("canvas").getContext("2d")!;

export const ErrorCanvasPreview = () => {
  return (
    <div>
      <h3>{t("canvasError.cannotShowPreview")}</h3>
      <p>
        <span>{t("canvasError.canvasTooBig")}</span>
      </p>
      <em>({t("canvasError.canvasTooBigTip")})</em>
    </div>
  );
};

const renderPreview = (
  content: HTMLCanvasElement | Error,
  previewNode: HTMLDivElement,
) => {
  unmountComponentAtNode(previewNode);
  previewNode.innerHTML = "";
  if (content instanceof HTMLCanvasElement) {
    previewNode.appendChild(content);
  } else {
    render(<ErrorCanvasPreview />, previewNode);
  }
};

export type ExportCB = (
  elements: readonly NonDeletedExcalidrawElement[],
  scale?: number,
) => void;

const ExportButton: React.FC<{
  color: keyof OpenColor;
  onClick: () => void;
  title: string;
  shade?: number;
}> = ({ children, title, onClick, color, shade = 6 }) => {
  console.log("children",children,title,onclick)
  return (
    <button
      className="ExportDialog-imageExportButton"
      style={{
        ["--button-color" as any]: OpenColor[color][shade],
        ["--button-color-darker" as any]: OpenColor[color][shade + 1],
        ["--button-color-darkest" as any]: OpenColor[color][shade + 2],
      }}
      title={title}
      aria-label={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const ImageExportModal = ({
  elements,
  appState,
  exportPadding = DEFAULT_EXPORT_PADDING,
  actionManager,
  onExportToPng,
  onExportToSvg,
  onExportToClipboard,
}: {
  appState: AppState;
  elements: readonly NonDeletedExcalidrawElement[];
  exportPadding?: number;
  actionManager: ActionsManagerInterface;
  onExportToPng: ExportCB;
  onExportToSvg: ExportCB;
  onExportToClipboard: ExportCB;
  onCloseRequest: () => void;
}) => {
  const someElementIsSelected = isSomeElementSelected(elements, appState);
  const [exportSelected, setExportSelected] = useState(someElementIsSelected);
  const previewRef = useRef<HTMLDivElement>(null);
  const { exportBackground, viewBackgroundColor } = appState;

  const exportedElements = exportSelected
    ? getSelectedElements(elements, appState)
    : elements;
//console.log("dd",previewRef.current?.children[0])
  useEffect(() => {
    setExportSelected(someElementIsSelected);
  }, [someElementIsSelected]);

  useEffect(() => {
    const previewNode = previewRef.current;
    if (!previewNode) {
      return;
    }
    try {
      const canvas = exportToCanvas(exportedElements, appState, {
        exportBackground,
        viewBackgroundColor,
        exportPadding,
      });

      // if converting to blob fails, there's some problem that will
      // likely prevent preview and export (e.g. canvas too big)
      canvasToBlob(canvas)
        .then(() => {
          renderPreview(canvas, previewNode);
          console.log("canvas",canvas.toDataURL('image/png'))
          console.log("previewNode",previewNode.children[0])
        })
        .catch((error) => {
          console.error(error);
          renderPreview(new CanvasError(), previewNode);
        });
    } catch (error) {
      console.error(error);
      renderPreview(new CanvasError(), previewNode);
    }
  }, [
    appState,
    exportedElements,
    exportBackground,
    exportPadding,
    viewBackgroundColor,
  ]);

  return (
    <div className="ExportDialog">
      <div className="ExportDialog__preview" ref={previewRef} />
      {supportsContextFilters &&
        actionManager.renderAction("exportWithDarkMode")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            // dunno why this is needed, but when the items wrap it creates
            // an overflow
            overflow: "hidden",
          }}
        >
          {actionManager.renderAction("changeExportBackground")}
          {someElementIsSelected && (
            <CheckboxItem
              checked={exportSelected}
              onChange={(checked) => setExportSelected(checked)}
            >
              {t("labels.onlySelected")}
            </CheckboxItem>
          )}
          {actionManager.renderAction("changeExportEmbedScene")}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: ".6em" }}>
        <Stack.Row gap={2}>
          {actionManager.renderAction("changeExportScale")}
        </Stack.Row>
        <p style={{ marginLeft: "1em", userSelect: "none" }}>Scale</p>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: ".6em 0",
        }}
      >
        {!fsSupported && actionManager.renderAction("changeProjectName")}
      </div>
      <Stack.Row gap={2} justifyContent="center" style={{ margin: "2em 0" }}>
        <ExportButton
          color="indigo"
          title={t("buttons.exportToPng")}
          aria-label={t("buttons.exportToPng")}
          onClick={() => {onExportToPng(exportedElements)
          console.log("exportedElements",exportedElements)}
          }
        >
          PNG
        </ExportButton>
        <ExportButton
          color="red"
          title={t("buttons.exportToSvg")}
          aria-label={t("buttons.exportToSvg")}
          onClick={() => onExportToSvg(exportedElements)}
        >
          SVG
        </ExportButton>
        {probablySupportsClipboardBlob && (
          <ExportButton
            title={t("buttons.copyPngToClipboard")}
            onClick={() => onExportToClipboard(exportedElements)}
            color="gray"
            shade={7}
          >
            {clipboard}
          </ExportButton>
        )}
      </Stack.Row>
    </div>
  );
};

 const OnSaveImage = ({
  elements,
  appState,
  exportPadding = DEFAULT_EXPORT_PADDING,

}: {
  appState: AppState;
  elements: readonly NonDeletedExcalidrawElement[];
  exportPadding?: number;

}) => {
 
  const [pnSave, setPngSave] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { exportBackground, viewBackgroundColor } = appState;
  let scale:number;

 
 
  const dataURItoBlob=(dataURI:string)=> {
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
      byteString = atob(dataURI.split(',')[1]);
    else
      byteString = unescape(dataURI.split(',')[1]);
  
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
  
    return new Blob([ia], {
      type: mimeString
    });
  }
   useEffect(() => {
     if(pnSave){
    const previewNode = previewRef.current;
    if (!previewNode) {
      return;
    }
      const canvas = exportToCanvas(elements, appState, {
        exportBackground,
        viewBackgroundColor,
        exportPadding,
      });
     console.log("canvas",canvas.toDataURL('image/png'))
let href;
let img=canvas.toDataURL('image/png')

let data= dataURItoBlob(img)
console.log("data",data.size)

      const uploadTask = storage.ref(`images/${data.size}`).put(data);
      uploadTask.on(
        "state_changed",
        snapshot=>{},
        error =>{
          console.log(error)
        },
        ()=>{
          storage
            .ref("images")
            .child("name")
            .getDownloadURL()
            .then(url => {
              console.log(url)
            })
        }
      )
      const context = canvas.getContext("2d")!;
      console.log("context",context)

      // context.setTransform(1, 0, 0, 1, 0, 0);
      // context.save();
      // context.scale(scale, scale);
      const normalizedCanvasWidth = canvas.width ;
  const normalizedCanvasHeight = canvas.height ;
      console.log("context",normalizedCanvasWidth,normalizedCanvasHeight)
      context.clearRect(0, 0, normalizedCanvasWidth, normalizedCanvasHeight);
      console.log("context",context)

     

    
     }
   //  console.log("i",img);
    return(
      setPngSave(false)
    )
  }, [
  
    pnSave
  ]);

  return(
    <>
      <h1  ref={previewRef} />
     
     <button
     
         onClick={() => {
           //onExportToPng(exportedElements)
           
           setPngSave(true)
        }}
         >Save</button>
        <button 
        //   onClick={onClear}
       >clear</button>
    </>
  )
}
// const displayImage=(row:number,images:any)=>{
// //const [image,setImage]=useState(null)
//   images.getDownloadURL().then((url:any) => {
//     // in here you can set the URL for the avatar
//     console.log(url)
//    // setImage(url)
//   });

 
//     }
  
// const showList =()=>{
//   let i=0
//   storage.ref().child('images').listAll().then(function(result){
//     result.items.forEach(function(imageRef){
//       //console.log(imageRef.toString())
// i++
//       displayImage(i, imageRef)
//     })
//   })
  
//}
// export const actionClearCanvas = register({
//   name: "clearCanvas",
//   perform: (elements, appState: AppState) => {
//     return {
//       elements: elements.map((element) =>
//         newElementWith(element, { isDeleted: true }),
//       ),
//       appState: {
//         ...getDefaultAppState(),
//         theme: appState.theme,
//         elementLocked: appState.elementLocked,
//         exportBackground: appState.exportBackground,
//         exportEmbedScene: appState.exportEmbedScene,
//         gridSize: appState.gridSize,
//         showStats: appState.showStats,
//         pasteDialog: appState.pasteDialog,
//       },
//       commitToHistory: true,
//     };
//   },
//   PanelComponent: ({ updateData }) => (
//     <ToolButton
//       type="button"
//       icon={trash}
//       title={t("buttons.clearReset")}
//       aria-label={t("buttons.clearReset")}
//       showAriaLabel={useIsMobile()}
//       onClick={() => {
//         if (window.confirm(t("alerts.clearReset"))) {
//           updateData(null);
//         }
//       }}
//       data-testid="clear-canvas-button"
//     />
//   ),
// });

export const ImageExportDialog = ({
  elements,
  appState,
  exportPadding = DEFAULT_EXPORT_PADDING,
  actionManager,
  onExportToPng,
  onExportToSvg,
  onExportToClipboard,
}: {
  appState: AppState;
  elements: readonly NonDeletedExcalidrawElement[];
  exportPadding?: number;
  actionManager: ActionsManagerInterface;
  onExportToPng: ExportCB;
  onExportToSvg: ExportCB;
  onExportToClipboard: ExportCB;
}) => {
  const [modalIsShown, setModalIsShown] = useState(false);
  const [imageIsShown, setImageIsShown] = useState(false);
  const [pngIsShown, setPngIsShown] = useState(false);
  const [imageS, setImage] = useState([]);

  const handleClose = React.useCallback(() => {
    setModalIsShown(false);
    setImageIsShown(false);

  }, []);
  useEffect(() => {
    if(pngIsShown){
  console.log("inside")
    //debugger
  storage.ref().child('images').listAll().then(function(result){
    result.items.forEach(function(imageRef){
      //console.log(imageRef.toString())
      imageRef.getDownloadURL().then((url:any) => {
        console.log("url",url)
        setImage(url)
      })
       
       });

      })
    }
return(
  setPngIsShown(false)

)
      
  },[pngIsShown])
  return (
    <>
    
      <ToolButton
        onClick={() => {
          setModalIsShown(true);
        }}
        data-testid="image-export-button"
        icon={exportImage}
        type="button"
        aria-label={t("buttons.exportImage")}
        showAriaLabel={useIsMobile()}
        title={t("buttons.exportImage")}
      />
      {modalIsShown && (
        <Dialog onCloseRequest={handleClose} title={t("buttons.exportImage")}>
          <ImageExportModal
            elements={elements}
            appState={appState}
            exportPadding={exportPadding}
            actionManager={actionManager}
            onExportToPng={onExportToPng}
            onExportToSvg={onExportToSvg}
            onExportToClipboard={onExportToClipboard}
            onCloseRequest={handleClose}
          />
        </Dialog>
      )}
     
      <OnSaveImage
     elements={elements}
     appState={appState}
     exportPadding={exportPadding}
    //  actionManager={actionManager}
    //  onExportToPng={onExportToPng}
    //  onExportToSvg={onExportToSvg}
    //  onExportToClipboard={onExportToClipboard}
    //  onCloseRequest={handleClose}
      
      />
     <button
    onClick={() => {
      setImageIsShown(true);
      setPngIsShown(true);

    }}
     >list</button>
       {imageIsShown && (
        <Dialog onCloseRequest={handleClose} title="list of images">
            <ul>
              <li>
                {
                // <a href="">{imageS}</a>
                }
              
                </li>
            </ul>
        </Dialog>)}
    </>
  );
};
