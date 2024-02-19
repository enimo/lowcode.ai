/**
 * 
 * 可通过 $page 获取或修改当前页面的 变量 状态 handler lifecycle 等信息
 * 可通过 app 获取或修改全局应用的 变量 状态 等信息
 * 具体可以console.info 在编辑器Console面板查看更多信息
 * 注意：该方法仅在所属的页面有效
 * 如果需要 async-await，请修改成 export default async function() {}
 * 帮助文档 https://cloud.tencent.com/document/product/1301/57912
 **/

/**
 * @param {Object} event - 事件对象
 * @param {string} event.type - 事件名
 * @param {any} event.detail - 事件携带自定义数据
 *
 * @param {Object} data
 * @param {any} data.target - 获取事件传参的数据
 **/
export default async function({event, data}) {

    const wxcloud = await app.cloud.getCloudInstance();
    const openid = $w.app.dataset.state.openid || 'weda_agent_demo';

    var text = data.target.text || '';
    var lang = data.target.lang || 'Chinese';
    var params_data = {
                text,
                lang,
                openid
    }

    wxcloud.callFunction({
          name: "ai_lowcode",
          data: params_data
    })
    .then(async (res) => {

        let result = res.result['choices'][0]['message']['content'];
        $page.dataset.state.result = result.replace(/[\r\n]/g, "<br>");
        $page.dataset.state.showResult = true;
        $page.dataset.state.loading = false;

        if(res.result['errCode'] == 22000) { 

          const ret = await app.cloud.callModel({
            name: 'chatgpt_qa_way5e0s', // 数据模型标识，可以前往「数据源 - 数据模型」列表页查看
            methodName: 'wedaCreate', // 数据模型方法标识，支持的方法可以前往「数据源 - 数据模型」的任一数据模型详情页查看当前模型支持的方法
            params: {req: text, res: result, openid, appname: 'weda_agent_demo'}, // 数据模型方法的入参
        
          });
          return ret;
        }
        return false;
    });

}