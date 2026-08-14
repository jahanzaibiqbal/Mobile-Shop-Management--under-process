import React from 'react';
import { UserRole } from '../types';
import { Shield, User, Award, Check } from 'lucide-react';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (r: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onRoleChange }) => {
  const roles: { name: UserRole; badge: string; color: string; desc: string; permissions: string[] }[] = [
    {
      name: 'Admin',
      badge: 'Owner / Root',
      color: 'indigo',
      desc: 'Full master authorization core',
      permissions: ['Add Item', 'Delete Item', 'Daily / Monthly / Yearly Reports + Profit', 'Edit Qty & Sale Prices', 'Sale option (Updates stock)', 'Cancel Sale']
    },
    {
      name: 'Shoaib',
      badge: 'Manager',
      color: 'teal',
      desc: 'Senior Store Operator',
      permissions: ['Add Item', 'Daily / Monthly / Yearly Sales Reports', 'Edit Qty & Sale Prices', 'Sale option (Updates stock)', 'Cancel Sale', '❌ No Deletion']
    },
    {
      name: 'Zohaib',
      badge: 'Sales Representative',
      color: 'slate',
      desc: 'Front desk checkout associate',
      permissions: ['View Item Stock', 'Sale option (Updates stock)', '❌ Hidden Ledger & Reports', '❌ No Editing', '❌ Hidden Cost Prices & Analytics', '❌ No Deletion']
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-sm p-6 text-slate-800 font-sans shadow-xs">
      <div className="mb-4">
        <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-indigo-600 inline-block"></span>
          Active Clerk Control Centre
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Switch roles to review custom checkout authorization layers, sales cancellation rights, and deletion lock systems.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {roles.map((role) => {
          const isActive = currentRole === role.name;
          return (
            <button
              key={role.name}
              type="button"
              onClick={() => onRoleChange(role.name)}
              className={`text-left p-4 rounded-sm border transition-all duration-200 cursor-pointer flex flex-col relative overflow-hidden ${
                isActive
                  ? 'bg-indigo-50/50 border-2 border-indigo-600 ring-4 ring-indigo-500/10 shadow-xs'
                  : 'bg-slate-50/50 border-slate-200 hover:border-slate-350 hover:bg-slate-50'
              }`}
            >
              {/* Header inside role card */}
              <div className="flex justify-between items-start w-full gap-2">
                <div>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-slate-400 block font-display">
                    {role.badge}
                  </span>
                  <strong className="text-base font-black text-slate-900 mt-0.5 block font-display italic uppercase tracking-tight">{role.name}</strong>
                </div>
                {isActive && (
                  <span className="p-1 bg-indigo-600 text-white rounded-full">
                    <Check size={12} />
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500 mt-1.5 font-sans italic">
                {role.desc}
              </p>

              {/* Minor listing of allowed actions */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-1">
                {role.permissions.map((p, idx) => (
                  <span
                    key={idx}
                    className={`block text-[9px] font-bold ${
                      p.startsWith('❌') 
                        ? 'text-red-500' 
                        : p.includes('Admin')
                          ? 'text-indigo-600'
                          : 'text-slate-600'
                    }`}
                  >
                    • {p}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
