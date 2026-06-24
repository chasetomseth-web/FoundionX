'use client';

import React, { useState, useEffect } from 'react';
import { Users, Loader2, Save, CheckCircle, Plus, Trash2, X } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  createdAt: string;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  timestamp: string;
}

export default function TeamSection() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' as const });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [membersRes, activityRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/activity'),
      ]);
      const membersData = await membersRes.json();
      const activityData = await activityRes.json();
      setMembers(membersData.members || []);
      setActivity(activityData.activity || []);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      setShowInvite(false);
      setInviteForm({ email: '', role: 'staff' });
      loadData();
    } catch (error) {
      console.error('Invite error:', error);
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const inputCls = 'w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors';

  const roleColors: Record<string, string> = {
    admin: 'bg-danger-bg text-danger',
    manager: 'bg-warning-bg text-warning',
    staff: 'bg-info-bg text-info',
  };

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="text-sm font-600 text-foreground">Team Members</h3>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-500 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={12} />
          Invite Member
        </button>
      </div>

      {/* Role Descriptions */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-2">
        <p className="text-xs font-600 text-foreground">Role Permissions:</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <span className="font-500 text-danger">Admin:</span> Full access to all settings
          </div>
          <div>
            <span className="font-500 text-warning">Manager:</span> Can manage orders & products
          </div>
          <div>
            <span className="font-500 text-info">Staff:</span> View-only access
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground">Role</th>
              <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No team members yet. Invite your first member above.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-foreground">{member.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-500 ${roleColors[member.role]}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1 hover:bg-danger-bg rounded text-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Activity Log */}
      <div>
        <h4 className="text-sm font-600 text-foreground mb-3">Recent Activity</h4>
        <div className="border border-border rounded-lg divide-y divide-border">
          {activity.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              No activity yet
            </div>
          ) : (
            activity.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-500 text-foreground">{log.user}</span>
                  <span className="text-muted-foreground ml-1">{log.action}</span>
                </div>
                <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-sm font-600 text-foreground">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-500 text-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="colleague@example.com"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-500 text-foreground block mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                  className={inputCls}
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteForm.email}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-500 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {inviting ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 border border-border text-sm font-500 rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}