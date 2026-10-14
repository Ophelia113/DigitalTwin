import React from 'react';
import {
  X,
  Play,
  Flame,
  CheckCircle2,
  ShieldAlert,
  HelpCircle,
  Lightbulb,
  Cpu,
  ArrowRight
} from 'lucide-react';

interface ProjectQuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: () => void;
}

export const ProjectQuickGuideModal: React.FC<ProjectQuickGuideModalProps> = ({
  isOpen,
  onClose,
  onStartDemo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/30">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                How This Digital Twin Works (Quick 30-Second Guide)
              </h3>
              <p className="text-xs text-slate-400">
                Simple overview for project demonstration and viva evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-sm text-slate-300 overflow-y-auto max-h-[75vh]">
          {/* 3 Simple Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xl block mb-1">🏭</span>
              <h4 className="font-bold text-white text-xs mb-1">1. The Physical Belt</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                A tabletop conveyor with 2 rollers and a continuous belt, driven by a 12V DC motor.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xl block mb-1">📡</span>
              <h4 className="font-bold text-white text-xs mb-1">2. Smart Sensors</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Temperature probes at both ends, a vibration sensor at the drive, and a sonar sensor detecting passing boxes.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-xl block mb-1">🛡️</span>
              <h4 className="font-bold text-white text-xs mb-1">3. Auto Safety Stop</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                If motor temperature or vibration exceeds safe limits, the system stops the conveyor automatically.
              </p>
            </div>
          </div>

          {/* Interactive Steps to Show Anyone */}
          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-900/40 space-y-3">
            <h4 className="font-bold text-cyan-300 text-xs uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              How to Demonstrate this to Anyone (3 Easy Steps)
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2 bg-slate-900/60 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                <div>
                  <strong className="text-white">Start the Belt:</strong> Click the green <strong>"Start Conveyor"</strong> button. The 3D model turns on, rollers rotate, and packages move smoothly.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-slate-900/60 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                <div>
                  <strong className="text-white">Watch Object Detection:</strong> As the box passes the middle arched sensor, the distance drops and the item counter increments automatically.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 bg-slate-900/60 rounded-lg">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                <div>
                  <strong className="text-white">Demonstrate Safety Auto-Stop:</strong> Click <strong>"🔥 Overheat Head"</strong> or <strong>"🔥 Overheat Tail"</strong>. Watch the temperature climb and trigger an immediate emergency cutoff!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">Ready to test the demo?</span>
          <button
            onClick={() => {
              onStartDemo();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
          >
            <span>Got It — Let's Explore!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
