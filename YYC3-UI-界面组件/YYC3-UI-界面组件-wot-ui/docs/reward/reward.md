# 🥤一杯咖啡

~~求求了，给点吧!~~

如果您认为本项目对你的工作起到了帮助，可以通过以下方式捐助我们的研发工作，使本项目持续发展下去，捐赠后你的昵称和主页将会被展示在 `wot ui` 文档的捐赠榜单上。

如果您~~钱多没地方花~~财大气粗，可以在我们这开一个[赞助位](./sponsor)，我们~~给你磕一个~~非常欢迎！

:::tip 提醒
捐赠后，可以发送邮件到1780903673@qq.com或者通过github、微信群等社交平台告知要展示的捐赠者名称、留言、链接 (链接可以是您的博客、github、个人网站、公司产品等)，如果可以，请务必留下你的Github用户名。
:::

### 爱发电捐赠

[https://afdian.com/a/weisheng233](https://afdian.com/a/weisheng233)


### 扫码捐赠


<div style="display: inline-block; margin-right: 120px;">
  <img style="width: 250px; height: 250px;" :src="WxQrcode" />
  <div style="text-align: center;">微信</div>
</div>

<div style="display: inline-block;">
  <img style="width: 250px; height: 250px;" :src="AlipayQrcode" />
  <div style="text-align: center;">支付宝</div>
</div>

<script>
import WxQrcode from '/weixinQrcode.jpg'
import AlipayQrcode from '/alipayQrcode.jpg'

export default {
  data () {
    return {
      WxQrcode,
      AlipayQrcode
    }
  }
}
</script>