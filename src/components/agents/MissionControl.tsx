import React, { useState, useEffect, useRef } from 'react';
import {
    Terminal,
    Cpu,
    Globe,
    Play,
    Square,
    Activity,
    Server,
    Shield,
    Search,
    Command,
    Layout,
    Maximize2
} from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    type: 'Browser' | 'Terminal' | 'Test';
    status: 'Idle' | 'Running' | 'Error' | 'Completed';
    task: string;
    uptime: string;
}

const MissionControl: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([
        { id: '1', name: 'Web Scraper Alpha', type: 'Browser', status: 'Running', task: 'Monitoring competitor prices', uptime: '1h 23m' },
        { id: '2', name: 'Integration Test Runner', type: 'Test', status: 'Idle', task: 'Waiting for commit', uptime: '0m' },
        { id: '3', name: 'System Health Sentinel', type: 'Terminal', status: 'Running', task: 'Checking server logs', uptime: '24d 1h' },
        { id: '4', name: 'Auto-Reply Bot', type: 'Terminal', status: 'Completed', task: 'Processed 50 emails', uptime: '5m' },
    ]);

    const [logs, setLogs] = useState<string[]>([
        '> System initialized...',
        '> Connecting to satellite servers...',
        '> Connection established.',
        '> Agent "Web Scraper Alpha" started task "Monitoring competitor prices".',
        '> [INFO] Data packet received from node 42.',
        '> [WARN] Latency spike detected in region us-east-1.',
    ]);

    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Simulate incoming logs
        const interval = setInterval(() => {
            const msgs = [
                '> scanning network ports...',
                '> synchronizing database shards...',
                '> optimizing neural weights...',
                '> [AGENT-1] found new price data: $102.50',
                '> [AGENT-3] cpu usage normal at 24%',
                '> checking for updates...'
            ];
            const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
            setLogs(prev => [...prev.slice(-19), randomMsg]); // Keep last 20 logs
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const getStatusColor = (status: Agent['status']) => {
        switch (status) {
            case 'Running': return 'text-emerald-400';
            case 'Error': return 'text-red-400';
            case 'Idle': return 'text-gray-400';
            case 'Completed': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="h-full bg-slate-950 text-slate-200 p-6 overflow-y-auto font-mono">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center pb-6 border-b border-slate-800">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                            <Command className="w-8 h-8 text-cyan-400" />
                            MISSION CONTROL
                        </h1>
                        <p className="text-slate-400 mt-1">Autonomous Agent Orchestration Node</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-4 py-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-sm font-semibold text-emerald-500">SYSTEM ONLINE</span>
                        </div>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-sm">Active Agents</span>
                            <Cpu className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">4</div>
                        <div className="text-xs text-emerald-400 mt-1">▲ 2 from uptime</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-sm">Tasks/Min</span>
                            <Activity className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">842</div>
                        <div className="text-xs text-purple-400 mt-1">Processing</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-sm">Network Load</span>
                            <Globe className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">45 Mb/s</div>
                        <div className="text-xs text-blue-400 mt-1">Stable</div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-slate-400 text-sm">Security</span>
                            <Shield className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-3xl font-bold text-white">SECURE</div>
                        <div className="text-xs text-slate-500 mt-1">Last scan: 2m ago</div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">

                    {/* Agent Fleet */}
                    <div className="lg:col-span-2 bg-slate-900/50 rounded-xl border border-slate-800 p-6 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Server className="w-5 h-5 text-indigo-400" />
                                Active Fleet
                            </h2>
                            <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-sm text-white transition-colors">
                                + Launch Agent
                            </button>
                        </div>

                        <div className="grid gap-3 overflow-y-auto">
                            {agents.map(agent => (
                                <div key={agent.id} className="group bg-slate-800/50 hover:bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-all flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${agent.type === 'Browser' ? 'bg-orange-500/10 text-orange-400' :
                                                agent.type === 'Terminal' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-green-500/10 text-green-400'
                                            }`}>
                                            {agent.type === 'Browser' ? <Globe className="w-6 h-6" /> :
                                                agent.type === 'Terminal' ? <Terminal className="w-6 h-6" /> :
                                                    <Activity className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white">{agent.name}</div>
                                            <div className="text-sm text-slate-400">{agent.task}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <div className={`text-xs font-bold ${getStatusColor(agent.status)}`}>
                                                {agent.status.toUpperCase()}
                                            </div>
                                            <div className="text-xs text-slate-500">{agent.uptime}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                <Square className="w-4 h-4" fill="currentColor" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                                                <Terminal className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Terminal & Browser Preview */}
                    <div className="flex flex-col gap-6">
                        {/* Terminal */}
                        <div className="flex-1 bg-black rounded-xl border border-slate-800 p-4 font-mono text-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-8 bg-slate-900 flex items-center px-4 border-b border-slate-800">
                                <span className="text-slate-500 text-xs">terminal_output.log</span>
                                <div className="ml-auto flex gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                </div>
                            </div>
                            <div className="mt-6 h-full overflow-y-auto space-y-1 text-emerald-500/90 pb-2 custom-scrollbar">
                                {logs.map((log, i) => (
                                    <div key={i} className="opacity-80 hover:opacity-100">{log}</div>
                                ))}
                                <div ref={terminalEndRef} />
                            </div>
                        </div>

                        {/* Mini Browser Preview */}
                        <div className="h-48 bg-slate-100 rounded-xl border border-slate-800 overflow-hidden relative opacity-75 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10">
                                <div className="text-center">
                                    <Globe className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                                    <span className="text-slate-400 text-sm font-semibold">Live Browser Feed</span>
                                    <div className="text-xs text-slate-500">Monitoring Target...</div>
                                </div>
                            </div>
                            {/* Mock UI elements to look like a webpage */}
                            <div className="bg-white h-full w-full p-4 pointer-events-none select-none">
                                <div className="w-full h-8 bg-slate-200 rounded mb-4"></div>
                                <div className="flex gap-4">
                                    <div className="w-1/3 h-24 bg-slate-200 rounded"></div>
                                    <div className="w-2/3 h-24 bg-slate-200 rounded"></div>
                                </div>
                                <div className="w-full h-4 bg-slate-200 rounded mt-4"></div>
                                <div className="w-2/3 h-4 bg-slate-200 rounded mt-2"></div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 2px;
        }
      `}</style>
        </div>
    );
};

export default MissionControl;
