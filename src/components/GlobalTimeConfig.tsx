/**
 * Global Time Schedule Configuration Component
 * Allows admins to set and manage the global reference time
 */

import React, { useState, useEffect } from 'react';
import {
  getGlobalSchedule,
  initializeGlobalSchedule,
  updateReferenceTime,
  updateMatchInterval,
  getScheduleStats,
} from '@/lib/matchScheduleService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface GlobalScheduleConfig {
  referenceTime: Date;
  matchInterval: number;
  timezone: string;
}

export const GlobalTimeConfig: React.FC = () => {
  const [config, setConfig] = useState<GlobalScheduleConfig>({
    referenceTime: new Date(),
    matchInterval: 30,
    timezone: 'UTC',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const schedule = getGlobalSchedule();
    setConfig({
      referenceTime: new Date(schedule.referenceEpoch),
      matchInterval: schedule.matchInterval,
      timezone: schedule.timezone,
    });
  }, []);

  const handleReferenceTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setConfig((prev) => ({
      ...prev,
      referenceTime: newDate,
    }));
    setHasChanges(true);
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    setConfig((prev) => ({
      ...prev,
      matchInterval: minutes,
    }));
    setHasChanges(true);
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig((prev) => ({
      ...prev,
      timezone: e.target.value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateReferenceTime(config.referenceTime);
    if (config.matchInterval) {
      updateMatchInterval(config.matchInterval);
    }
    setHasChanges(false);
    setSuccessMessage('Global schedule updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleReset = () => {
    setIsEditing(false);
    setHasChanges(false);
    const schedule = getGlobalSchedule();
    setConfig({
      referenceTime: new Date(schedule.referenceEpoch),
      matchInterval: schedule.matchInterval,
      timezone: schedule.timezone,
    });
  };

  const handleSetToNow = () => {
    setConfig((prev) => ({
      ...prev,
      referenceTime: new Date(),
    }));
    setHasChanges(true);
  };

  const stats = getScheduleStats();

  const dateTimeStr = config.referenceTime.toISOString().slice(0, 16);

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Clock className="w-5 h-5" />
            Global Match Schedule
          </CardTitle>
          <CardDescription className="text-blue-800">
            Configure the global reference time that determines when all matches begin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-gray-700">Current Reference Time</div>
              <div className="text-lg font-mono text-blue-700 mt-1">
                {new Date(stats.referenceTime).toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-gray-700">Match Interval</div>
              <div className="text-lg font-mono text-blue-700 mt-1">
                {stats.interval}
              </div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <div className="text-sm font-semibold text-gray-700">Timezone</div>
              <div className="text-lg font-mono text-blue-700 mt-1">
                {stats.timezone}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {successMessage && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg text-sm">
              ✓ {successMessage}
            </div>
          )}

          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Edit Configuration
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Reference Time Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Reference Time</label>
                <input
                  type="datetime-local"
                  value={dateTimeStr}
                  onChange={handleReferenceTimeChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetToNow}
                  className="w-full mt-2"
                >
                  Set to Now
                </Button>
              </div>

              {/* Match Interval Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Match Interval (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  step="5"
                  value={config.matchInterval}
                  onChange={handleIntervalChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Time between each match start (e.g., 30 = new match every 30 minutes)
                </p>
              </div>

              {/* Timezone Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Timezone</label>
                <select
                  value={config.timezone}
                  onChange={handleTimezoneChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>UTC</option>
                  <option>EST</option>
                  <option>CST</option>
                  <option>PST</option>
                  <option>GMT</option>
                  <option>CET</option>
                  <option>IST</option>
                  <option>AEST</option>
                </select>
              </div>

              {/* Info Alert */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p>
                  Changes to the global reference time will affect all currently scheduled
                  matches. Make sure to notify users of any schedule changes.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impact Preview */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-sm text-purple-900">Impact Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-purple-800">
          <p>
            With a {config.matchInterval} minute interval:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              {Math.floor(1440 / config.matchInterval)} matches per day
            </li>
            <li>
              {Math.floor((1440 / config.matchInterval) * 7)} matches per week
            </li>
            <li>
              {Math.floor((1440 / config.matchInterval) * 365)} matches per year
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalTimeConfig;
