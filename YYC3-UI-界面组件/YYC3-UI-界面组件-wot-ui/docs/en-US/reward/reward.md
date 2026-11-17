# 🥤 Buy Us a Coffee

~~Please, give us something!~~

If you believe this project has helped your work, you can support our development work through the following methods to ensure the continued development of this project. After donating, your nickname and homepage will be displayed on the `wot ui` documentation's donor list.

If you ~~have too much money to spend~~ are generous, you can open a [Sponsorship Slot](./sponsor) with us. We ~~will kowtow to you~~ greatly appreciate it!

:::tip Reminder
After donating, you can send an email to 1780903673@qq.com or notify us through social platforms like GitHub or WeChat groups about the donor name, message, and link you would like to display (the link can be your blog, GitHub, personal website, company product, etc.). If possible, please be sure to leave your GitHub username.
:::

### Aifadian Donation

[https://afdian.com/a/weisheng233](https://afdian.com/a/weisheng233)


### QR Code Donation


<div style="display: inline-block; margin-right: 120px;">
  <img style="width: 250px; height: 250px;" :src="WxQrcode" />
  <div style="text-align: center;">WeChat</div>
</div>

<div style="display: inline-block;">
  <img style="width: 250px; height: 250px;" :src="AlipayQrcode" />
  <div style="text-align: center;">Alipay</div>
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
