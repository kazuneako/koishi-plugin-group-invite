import { Schema } from 'koishi'

export interface MasterConfig {
  masterId?: string
  official?: string
  rows: RolesConfig
}
export interface RolesConfig {
  owner: boolean
  admin: boolean
  member: boolean
}
export const RolesConfig:Schema<RolesConfig> = Schema.object({
  owner: Schema.boolean().default(true).description('是否开启群主权限'),
  admin: Schema.boolean().default(false).description('是否开启管理员权限'),
  member: Schema.boolean().default(false).description('是否开启成员权限')
}).description('权限设置')

export const MasterConfig:Schema<MasterConfig> = Schema.object({
  masterId: Schema.string().description('主人id'),
  official: Schema.string().description('通知群'),
  rows: RolesConfig
}).description('通知设置')

export const Config = Schema.intersect([
  MasterConfig,
])