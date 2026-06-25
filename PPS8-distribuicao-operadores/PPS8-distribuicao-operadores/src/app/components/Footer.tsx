import logoTexpact from "../../imports/texpact.svg";
import logoPrr from "../../imports/prr.svg";
import logoCiteve from "../../imports/citeve.svg";
import logoImpetus from "../../imports/impetus.svg";

export default function Footer() {
  return (
    <footer className="bg-[#2d2d2d] border-t border-[#3d3d3d]">
      <div className="w-[85%] mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <img src={logoTexpact} alt="TextPact" className="h-5 w-auto object-contain" />
            <img src={logoPrr} alt="PRR" className="h-5 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-6">
            <img src={logoCiteve} alt="CITEVE" className="h-7 w-auto object-contain" />
            <img src={logoImpetus} alt="Impetus" className="h-7 w-auto object-contain" />
          </div>
        </div>
      </div>
    </footer>
  );
}
