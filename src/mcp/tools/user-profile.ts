import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../utils/logger.js';
import { CONFIG } from '../../utils/config.js';

interface ProfileData {
  device_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  title?: string;
  gender?: string;
  updated_at: string;
}

export class UserProfileTools {
  private supabase: any;

  constructor() {
    const supabaseUrl = CONFIG.supabase.url;
    const supabaseKey = CONFIG.supabase.anonKey;
    
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      logger.warn('Supabase configuration not found, user profile features disabled');
    }
  }

  async updateUserProfile(args: any): Promise<CallToolResult> {
    try {
      if (!this.supabase) {
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: 'User profile feature not available - Supabase not configured',
          }),
        };
        return { content: [content] };
      }

      logger.info('Updating user profile', { 
        deviceId: args.device_id,
        hasPersonalInfo: !!args.first_name 
      });

      const profileData: ProfileData = {
        device_id: args.device_id,
        updated_at: new Date().toISOString()
      };

      // Only include fields that have values to avoid overwriting existing data
      if (args.first_name) profileData.first_name = args.first_name;
      if (args.last_name) profileData.last_name = args.last_name;
      if (args.email) profileData.email = args.email;
      if (args.phone) profileData.phone = args.phone;
      if (args.date_of_birth) profileData.date_of_birth = args.date_of_birth;
      if (args.title) profileData.title = args.title;
      if (args.gender) profileData.gender = args.gender;

      const { data, error } = await this.supabase
        .from('user_profiles')
        .upsert(profileData, { 
          onConflict: 'device_id',
          returning: 'minimal'
        });

      if (error) {
        throw error;
      }

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'User profile updated successfully',
          updated_fields: Object.keys(profileData).filter(key => key !== 'device_id' && key !== 'updated_at')
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('User profile update error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to update user profile',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }

  async getUserProfile(args: any): Promise<CallToolResult> {
    try {
      if (!this.supabase) {
        const content: TextContent = {
          type: 'text',
          text: JSON.stringify({
            success: false,
            message: 'User profile feature not available - Supabase not configured',
          }),
        };
        return { content: [content] };
      }

      logger.info('Getting user profile', { deviceId: args.device_id });

      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('device_id', args.device_id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      const profile = data ? {
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        dateOfBirth: data.date_of_birth || '',
        title: data.title || '',
        gender: data.gender || ''
      } : null;

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: true,
          data: profile,
          message: profile ? 'User profile found' : 'No user profile found',
        }, null, 2),
      };

      return {
        content: [content],
      };
    } catch (error) {
      logger.error('User profile retrieval error:', error);
      
      const content: TextContent = {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Failed to retrieve user profile',
        }, null, 2),
      };

      return {
        content: [content],
      };
    }
  }
}