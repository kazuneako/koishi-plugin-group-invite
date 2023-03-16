import { Context, h } from 'koishi'
import { Config } from 'koishi/lib/worker/daemon';

export const name = 'group-invite'

export * from './config'

export const memberEvents='invite_events_member';

declare module 'koishi' {
  interface Tables {
    invite_events_member: memberEvents
  }
}
export interface memberEvents {
  id: number
  message_id: string
  events_type: string
  from_user_id: string
  from_channel_id: string
  time: Date
}
export function apply(ctx: Context,config:Config) {
  ctx.model.extend(memberEvents, {
    // 各字段类型
    id: 'unsigned',
    message_id: 'string',
    events_type: 'string',
    from_user_id: 'string',
    from_channel_id: 'string',
    time: 'timestamp',
  }, {
    // 使用自增的主键值
    autoInc: true,
  })
  ctx.on('ready', () => {
    async function dodatabase() {
      // // 取消三天前的事件
      // const rows = await ctx.database.get(memberEvents, { time: { $lt: new Date() } ,events_type:{ $eq:'guild-request' } })
      // console.info(rows)
      ctx.database.remove(memberEvents, { time: { $lt: new Date(new Date().getTime()-86400*3) } })
    }
    //设置休眠时间否则database的方法不会加载
    setTimeout(()=>{
      dodatabase();
    }, 3000);
  })
  // ctx.on('dispose', () => {
  //   // async function dodatabase() {
  //   // }
  //   // dodatabase();
  //   // ctx.database.drop(memberEvents)
  // })
  ctx.on('guild-request', (session) => {
    async function sendmsg() {
      let user=await session.bot.getUser(session.userId).then(result=>{
        return result;
      })
      let guild=await session.bot.getGuild(session.channelId).then(result=>{
        return result;
      })
      let content='群邀请来自:\nQQ:'+user["username"]+'('+session.userId+')\n群聊:'+guild["guildName"]+'('+session.channelId+')';
      //主人id
      // let masterId=session.app.plugin(name).runtime.config.masterId
      let masterId=config['masterId']
      //官方（群）
      // let official=session.app.plugin(name).runtime.config.official
      let official=config['official']
      if(masterId != null && masterId != '')
        session.bot.sendPrivateMessage(masterId, content);
      if(official != null && official != '')
        session.bot.sendMessage(official, content, official);
      ctx.database.create(memberEvents, {
        message_id: session.messageId,
        events_type: 'guild-request',
        from_user_id: session.userId,
        from_channel_id: session.channelId,
        time: new Date(),
      })
    }
    sendmsg()
  })
  ctx.middleware((session, next) => {
    if (session.quote !=undefined && session.quote.userId === session.bot.userId && session.quote.content.startsWith('群邀请来自:')) {
      // let invite_roles=session.app.plugin(name).runtime.config.roles
      let invite_roles=config['rows']
      let user_roles=session.author.roles[0]
      // 如果是群聊进行权限控制
      if(session.subtype==='group'&& !invite_roles[user_roles])return next();
      async function sendRequest() {      
        let replyContent=session.elements[session.elements.length-1].attrs.content
        if(replyContent.substring(0,1)===' ')replyContent=replyContent.substring(1);
        let botmsg=session.quote.content;
        let userId=botmsg.substring(botmsg.indexOf('(')+1,botmsg.indexOf(')'))
        let guildId=botmsg.substring(botmsg.lastIndexOf('(')+1,botmsg.lastIndexOf(')'))
        let messageId=await queryEndGuildRequest(userId,guildId);
        if(messageId === undefined) return next();
        if(replyContent==='同意' || replyContent.toUpperCase()==='YES' || replyContent.toUpperCase()==='Y'){
          session.bot.handleGuildRequest(messageId, true, null);
          ctx.database.remove(memberEvents, { events_type:{ $eq:'guild-request' }, from_user_id:{ $eq:userId  }, from_channel_id:{ $eq:guildId } });
          return h('quote',{ id:session.quote.messageId })+'已同意'
        }
        else if(replyContent==='拒绝' || replyContent.toUpperCase()==='NO' || replyContent.toUpperCase()==='N'){
          session.bot.handleGuildRequest(messageId, false, null);
          ctx.database.remove(memberEvents, { events_type:{ $eq:'guild-request' }, from_user_id:{ $eq:userId  }, from_channel_id:{ $eq:guildId } });
          return h('quote',{ id:session.quote.messageId })+'已拒绝'
        }else return next();
      }
      return sendRequest();
    }
    return next();
  })
  async function queryEndGuildRequest(userId:string,guildId:string) {
    // let maxid=await ctx.database.eval(memberEvents,{ $max:'id' }, { events_type:{ $eq:'guild-request' }, from_user_id:{ $eq:userId  }, from_channel_id:{ $eq:guildId } })
    // let memberEventsArr=await ctx.database.get(memberEvents,{ id:{ $eq:maxid } })
    let memberEventsArr=await ctx.database.get(memberEvents, { events_type:{ $eq:'guild-request' }, from_user_id:{ $eq:userId  }, from_channel_id:{ $eq:guildId }  },{ limit:1, sort:{ time:'desc' } })
    if(memberEventsArr.length>0)
      return memberEventsArr[0]['message_id']
    return undefined;
  }
}
