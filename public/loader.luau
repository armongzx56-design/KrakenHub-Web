-- ==============================================================
-- 🌊 KRAKENHUB | KEY SYSTEM LOADER (POWERED BY PLATOBOOST)
-- Service ID: 35734
-- ==============================================================

local KEY_FILE = "KrakenHub_Key.txt"

-- 🗺️ Game Map Router (Auto-detect PlaceId / GameId)
local GAME_MAPS = {
    [104549080643413] = "https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/mahanakhon-racing.luau", -- MAHANAKHON RACING
    [84448037861644]  = "https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/urban-reload.luau",      -- Urban Reload
    [17300701837]     = "https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/sailueatarchiwa_cheat.luau", -- สายเลือดอาชีวะ
    [131481383443764] = "https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/sailueatarchiwa_cheat.luau", -- สายเลือดอาชีวะ Mixue
}

local function GetScriptUrlForGame()
    if GAME_MAPS[game.PlaceId] then
        return GAME_MAPS[game.PlaceId]
    end
    -- Fallback by GameId (for sub-places / universes)
    if game.GameId == 10771935715 then
        return GAME_MAPS[104549080643413]
    end
    -- Default fallback
    return "https://raw.githubusercontent.com/armongzx56-design/KrakenHub/main/sailueatarchiwa_cheat.luau"
end

-------------------------------------------------------------------------------
-- [ 1. Platoboost Core Cryptography & JSON Engine ]
-------------------------------------------------------------------------------
local a=2^32;local b=a-1;local function c(d,e)local f,g=0,1;while d~=0 or e~=0 do local h,i=d%2,e%2;local j=(h+i)%2;f=f+j*g;d=math.floor(d/2)e=math.floor(e/2)g=g*2 end;return f%a end;local function k(d,e,l,...)local m;if e then d=d%a;e=e%a;m=c(d,e)if l then m=k(m,l,...)end;return m elseif d then return d%a else return 0 end end;local function n(d,e,l,...)local m;if e then d=d%a;e=e%a;m=(d+e-c(d,e))/2;if l then m=n(m,l,...)end;return m elseif d then return d%a else return b end end;local function o(p)return b-p end;local function q(d,r)if r<0 then return lshift(d,-r)end;return math.floor(d%2^32/2^r)end;local function s(p,r)if r>31 or r<-31 then return 0 end;return q(p%a,r)end;local function lshift(d,r)if r<0 then return s(d,-r)end;return d*2^r%2^32 end;local function t(p,r)p=p%a;r=r%32;local u=n(p,2^r-1)return s(p,r)+lshift(u,32-r)end;local v={0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2}local function w(x)return string.gsub(x,".",function(l)return string.format("%02x",string.byte(l))end)end;local function y(z,A)local x=""for B=1,A do local C=z%256;x=string.char(C)..x;z=(z-C)/256 end;return x end;local function D(x,B)local A=0;for B=B,B+3 do A=A*256+string.byte(x,B)end;return A end;local function E(F,G)local H=64-(G+9)%64;G=y(8*G,8)F=F.."\128"..string.rep("\0",H)..G;assert(#F%64==0)return F end;local function I(J)J[1]=0x6a09e667;J[2]=0xbb67ae85;J[3]=0x3c6ef372;J[4]=0xa54ff53a;J[5]=0x510e527f;J[6]=0x9b05688c;J[7]=0x1f83d9ab;J[8]=0x5be0cd19;return J end;local function K(F,B,J)local L={}for M=1,16 do L[M]=D(F,B+(M-1)*4)end;for M=17,64 do local N=L[M-15]local O=k(t(N,7),t(N,18),s(N,3))N=L[M-2]L[M]=(L[M-16]+O+L[M-7]+k(t(N,17),t(N,19),s(N,10)))%a end;local d,e,l,P,Q,R,S,T=J[1],J[2],J[3],J[4],J[5],J[6],J[7],J[8]for B=1,64 do local O=k(t(d,2),t(d,13),t(d,22))local U=k(n(d,e),n(d,l),n(e,l))local V=(O+U)%a;local W=k(t(Q,6),t(Q,11),t(Q,25))local X=k(n(Q,R),n(o(Q),S))local Y=(T+W+X+v[B]+L[B])%a;T=S;S=R;R=Q;Q=(P+Y)%a;P=l;l=e;e=d;d=(Y+V)%a end;J[1]=(J[1]+d)%a;J[2]=(J[2]+e)%a;J[3]=(J[3]+l)%a;J[4]=(J[4]+P)%a;J[5]=(J[5]+Q)%a;J[6]=(J[6]+R)%a;J[7]=(J[7]+S)%a;J[8]=(J[8]+T)%a end;local function Z(F)F=E(F,#F)local J=I({})for B=1,#F,64 do K(F,B,J)end;return w(y(J[1],4)..y(J[2],4)..y(J[3],4)..y(J[4],4)..y(J[5],4)..y(J[6],4)..y(J[7],4)..y(J[8],4))end;local e;local l={["\\"]="\\",["\""]="\"",["\b"]="b",["\f"]="f",["\n"]="n",["\r"]="r",["\t"]="t"}local P={["/"]="/"}for Q,R in pairs(l)do P[R]=Q end;local S=function(T)return"\\"..(l[T]or string.format("u%04x",T:byte()))end;local B=function(M)return"null"end;local v=function(M,z)local _={}z=z or{}if z[M]then error("circular reference")end;z[M]=true;if rawget(M,1)~=nil or next(M)==nil then local A=0;for Q in pairs(M)do if type(Q)~="number"then error("invalid table: mixed or invalid key types")end;A=A+1 end;if A~=#M then error("invalid table: sparse array")end;for a0,R in ipairs(M)do table.insert(_,e(R,z))end;z[M]=nil;return"["..table.concat(_,",").."]"else for Q,R in pairs(M)do if type(Q)~="string"then error("invalid table: mixed or invalid key types")end;table.insert(_,e(Q,z)..":"..e(R,z))end;z[M]=nil;return"{"..table.concat(_,",").."}"end end;local g=function(M)return'"'..M:gsub('[%z\1-\31\\"]',S)..'"'end;local a1=function(M)if M~=M or M<=-math.huge or M>=math.huge then error("unexpected number value '"..tostring(M).."'")end;return string.format("%.14g",M)end;local j={["nil"]=B,["table"]=v,["string"]=g,["number"]=a1,["boolean"]=tostring}e=function(M,z)local x=type(M)local a2=j[x]if a2 then return a2(M,z)end;error("unexpected type '"..x.."'")end;local a3=function(M)return e(M)end;local a4;local N=function(...)local _={}for a0=1,select("#",...)do _[select(a0,...)]=true end;return _ end;local L=N(" ","\t","\r","\n")local p=N(" ","\t","\r","\n","]","}",",")local a5=N("\\","/",'"',"b","f","n","r","t","u")local m=N("true","false","null")local a6={["true"]=true,["false"]=false,["null"]=nil}local a7=function(a8,a9,aa,ab)for a0=a9,#a8 do if aa[a8:sub(a0,a0)]~=ab then return a0 end end;return#a8+1 end;local ac=function(a8,a9,J)local ad=1;local ae=1;for a0=1,a9-1 do ae=ae+1;if a8:sub(a0,a0)=="\n"then ad=ad+1;ae=1 end end;error(string.format("%s at line %d col %d",J,ad,ae))end;local af=function(A)local a2=math.floor;if A<=0x7f then return string.char(A)elseif A<=0x7ff then return string.char(a2(A/64)+192,A%64+128)elseif A<=0xffff then return string.char(a2(A/4096)+224,a2(A%4096/64)+128,A%64+128)elseif A<=0x10ffff then return string.char(a2(A/262144)+240,a2(A%262144/4096)+128,a2(A%4096/64)+128,A%64+128)end;error(string.format("invalid unicode codepoint '%x'",A))end;local ag=function(ah)local ai=tonumber(ah:sub(1,4),16)local aj=tonumber(ah:sub(7,10),16)if aj then return af((ai-0xd800)*0x400+aj-0xdc00+0x10000)else return af(ai)end end;local ak=function(a8,a0)local _=""local al=a0+1;local Q=al;while al<=#a8 do local am=a8:byte(al)if am<32 then ac(a8,al,"control character in string")elseif am==92 then _=_..a8:sub(Q,al-1)al=al+1;local T=a8:sub(al,al)if T=="u"then local an=a8:match("^[dD][89aAbB]%x%x\\u%x%x%x%x",al+1)or a8:match("^%x%x%x%x",al+1)or ac(a8,al-1,"invalid unicode escape in string")_=_..ag(an)al=al+#an else if not a5[T]then ac(a8,al-1,"invalid escape char '"..T.."' in string")end;_=_..P[T]end;Q=al+1 elseif am==34 then _=_..a8:sub(Q,al-1)return _,al+1 end;al=al+1 end;ac(a8,a0,"expected closing quote for string")end;local ao=function(a8,a0)local am=a7(a8,a0,p)local ah=a8:sub(a0,am-1)local A=tonumber(ah)if not A then ac(a8,a0,"invalid number '"..ah.."'")end;return A,am end;local ap=function(a8,a0)local am=a7(a8,a0,p)local aq=a8:sub(a0,am-1)if not m[aq]then ac(a8,a0,"invalid literal '"..aq.."'")end;return a6[aq],am end;local ar=function(a8,a0)local _={}local A=1;a0=a0+1;while 1 do local am;a0=a7(a8,a0,L,true)if a8:sub(a0,a0)=="]"then a0=a0+1;break end;am,a0=a4(a8,a0)_[A]=am;A=A+1;a0=a7(a8,a0,L,true)local as=a8:sub(a0,a0)a0=a0+1;if as=="]"then break end;if as~=","then ac(a8,a0,"expected ']' or ','")end end;return _,a0 end;local at=function(a8,a0)local _={}a0=a0+1;while 1 do local au,M;a0=a7(a8,a0,L,true)if a8:sub(a0,a0)=="}"then a0=a0+1;break end;if a8:sub(a0,a0)~='"'then ac(a8,a0,"expected string for key")end;au,a0=a4(a8,a0)a0=a7(a8,a0,L,true)if a8:sub(a0,a0)~=":"then ac(a8,a0,"expected ':' after key")end;a0=a7(a8,a0+1,L,true)M,a0=a4(a8,a0)_[au]=M;a0=a7(a8,a0,L,true)local as=a8:sub(a0,a0)a0=a0+1;if as=="}"then break end;if as~=","then ac(a8,a0,"expected '}' or ','")end end;return _,a0 end;local av={['"']=ak,["0"]=ao,["1"]=ao,["2"]=ao,["3"]=ao,["4"]=ao,["5"]=ao,["6"]=ao,["7"]=ao,["8"]=ao,["9"]=ao,["-"]=ao,["t"]=ap,["f"]=ap,["n"]=ap,["["]=ar,["{"]=at}a4=function(a8,a9)local as=a8:sub(a9,a9)local a2=av[as]if a2 then return a2(a8,a9)end;ac(a8,a9,"unexpected character '"..as.."'")end;local aw=function(a8)if type(a8)~="string"then error("expected argument of type string, got "..type(a8))end;local _,a9=a4(a8,a7(a8,1,L,true))a9=a7(a8,a9,L,true)if a9<=#a8 then ac(a8,a9,"trailing garbage")end;return _ end;
local lEncode, lDecode, lDigest = a3, aw, Z;

local service = 35734;
local secret = "98a069b5-e9df-46cd-8d82-2b3186c8d703";
local useNonce = true;

local StatusCallback = function(msg) end
local fSetClipboard = setclipboard or toclipboard or function() end
local fStringChar, fToString, fStringSub, fOsTime, fMathRandom, fMathFloor = string.char, tostring, string.sub, os.time, math.random, math.floor

local function getClientHwid()
    local hwid = nil
    if gethwid then pcall(function() hwid = gethwid() end) end
    if not hwid and (syn and syn.get_hwid) then pcall(function() hwid = syn.get_hwid() end) end
    if not hwid and (getgenv and getgenv().gethwid) then pcall(function() hwid = getgenv().gethwid() end) end
    if not hwid and identifyexecutor then pcall(function() hwid = identifyexecutor() .. "-" .. tostring(game:GetService("Players").LocalPlayer.UserId) end) end
    if not hwid then
        pcall(function()
            local lp = game:GetService("Players").LocalPlayer
            if lp and lp.UserId then hwid = tostring(lp.UserId) end
        end)
    end
    return tostring(hwid or "KRAKEN-CLIENT")
end

local function performGet(url)
    -- 1. game:HttpGet (Standard across 100% Roblox executors)
    local s1, b1 = pcall(function()
        return game:HttpGet(url)
    end)
    if s1 and type(b1) == "string" and #b1 > 0 then
        return b1
    end

    -- 2. Executor request function fallback
    local req = (syn and syn.request) or (http and http.request) or request or http_request
    if req then
        local s2, r2 = pcall(function()
            return req({
                Url = url,
                Method = "GET",
                Headers = { ["User-Agent"] = "KrakenHub-Client/2.0" }
            })
        end)
        if s2 and type(r2) == "table" then
            local body = r2.Body or r2.body
            local code = r2.StatusCode or r2.status_code or r2.Status
            if (code == 200 or not code) and type(body) == "string" and #body > 0 then
                return body
            end
        end
    end
    return nil
end

local function performPost(url, bodyStr, headers)
    local req = (syn and syn.request) or (http and http.request) or request or http_request
    if req then
        local s, r = pcall(function()
            return req({
                Url = url,
                Method = "POST",
                Body = bodyStr,
                Headers = headers or { ["Content-Type"] = "application/json" }
            })
        end)
        if s and type(r) == "table" then
            local body = r.Body or r.body
            local code = r.StatusCode or r.status_code or r.Status
            return (code == 200 or not code), body
        end
    end
    return false, nil
end

local host = "https://api.platoboost.com";
task.spawn(function()
    local conn = performGet(host .. "/public/connectivity")
    if not conn then
        host = "https://api.platoboost.net"
    end
end)

local cachedLink, cachedTime = "", 0;
local function cacheLink()
    if cachedTime + (10*60) < fOsTime() then
        local ok, body = performPost(
            host .. "/public/start",
            lEncode({ service = service, identifier = lDigest(getClientHwid()) }),
            { ["Content-Type"] = "application/json" }
        )
        if ok and body then
            local decoded = lDecode(body);
            if decoded and decoded.success == true then
                cachedLink = decoded.data.url;
                cachedTime = fOsTime();
                return true, cachedLink;
            else
                StatusCallback(decoded and decoded.message or "Error");
                return false, decoded and decoded.message;
            end
        end
        return false, "Failed to get link";
    else
        return true, cachedLink;
    end
end

local function generateNonce()
    local str = ""
    for _ = 1, 16 do
        str = str .. fStringChar(fMathFloor(fMathRandom() * (122 - 97 + 1)) + 97)
    end
    return str
end

local function redeemKey(key)
    local nonce = generateNonce();
    local endpoint = host .. "/public/redeem/" .. fToString(service);
    local body = { identifier = lDigest(getClientHwid()), key = key }
    if useNonce then body.nonce = nonce end

    local ok, resBody = performPost(endpoint, lEncode(body), { ["Content-Type"] = "application/json" })
    if ok and resBody then
        local decoded = lDecode(resBody);
        if decoded and decoded.success == true and decoded.data.valid == true then
            if useNonce and decoded.data.hash ~= lDigest("true-" .. nonce .. "-" .. secret) then
                StatusCallback("Failed to verify integrity."); return false;
            end
            return true;
        end
    end
    return false;
end

local KRAKEN_APIS = {
    "https://krakenhub-three.vercel.app/api/whitelist/verify",
    "https://fynw54wx6g.apps.bot-hosting.cloud/api/whitelist/verify"
}
local lastErrorMsg = nil

local function verifyKey(rawKey)
    if not rawKey or rawKey == "" then return false, "Please enter your key!" end
    local key = string.upper(string.gsub(tostring(rawKey), "%s+", ""))
    lastErrorMsg = nil

    -- 1. Check KrakenHub Whitelist Key (KRAKEN-XXXX-XXXX-XXXX)
    local hwid = getClientHwid()
    for _, apiUrl in ipairs(KRAKEN_APIS) do
        local krakenUrl = apiUrl .. "?key=" .. key .. "&hwid=" .. hwid
        local krakenBody = performGet(krakenUrl)
        if krakenBody then
            local success, kDecoded = pcall(function() return lDecode(krakenBody) end)
            if success and type(kDecoded) == "table" then
                if kDecoded.valid == true then
                    return true, nil
                elseif kDecoded.error then
                    lastErrorMsg = kDecoded.error
                    return false, kDecoded.error
                end
            end
        end
    end

    -- 2. Check Platoboost Key System (Fallback)
    local nonce = generateNonce();
    local endpoint = host .. "/public/whitelist/" .. fToString(service) .. "?identifier=" .. lDigest(hwid) .. "&key=" .. key;
    if useNonce then endpoint = endpoint .. "&nonce=" .. nonce end

    local platoBody = performGet(endpoint)
    if platoBody then
        local success, decoded = pcall(function() return lDecode(platoBody) end)
        if success and decoded and decoded.success == true then
            if decoded.data and decoded.data.valid == true then
                if useNonce and decoded.data.hash ~= lDigest("true-" .. nonce .. "-" .. secret) then
                    StatusCallback("Integrity check failed."); return false, "Integrity check failed.";
                end
                return true, nil
            else
                if fStringSub(key, 1, 4) == "KEY_" then
                    local redSuccess = redeemKey(key);
                    if redSuccess then return true, nil end
                end
            end
        end
    end

    return false, lastErrorMsg or "Invalid or Expired Key! Please check again."
end

-------------------------------------------------------------------------------
-- [ 2. ตรวจสอบคีย์เดิมที่เซฟไว้ในเครื่อง (Auto Login) ]
-------------------------------------------------------------------------------
local function ReadSavedKey()
    if readfile and isfile and isfile(KEY_FILE) then
        local s, content = pcall(function() return readfile(KEY_FILE) end)
        if s and content then return content end
    end
    return nil
end

local function SaveKeyToFile(key)
    if writefile then
        pcall(function() writefile(KEY_FILE, key) end)
    end
end

-- ตรวจสอบคีย์จาก _G.KrakenKey หรือ getgenv().KrakenKey หรือไฟล์เซฟ
local explicitKey = _G.KrakenKey or (getgenv and getgenv().KrakenKey)
local forceUI = _G.ForceKeyUI or (getgenv and getgenv().ForceKeyUI)

_G.KrakenKey = nil
_G.ForceKeyUI = nil
if getgenv then
    pcall(function()
        getgenv().KrakenKey = nil
        getgenv().ForceKeyUI = nil
    end)
end

-- ถ้าสั่ง ForceKeyUI ให้ลบไฟล์คีย์เก่าทิ้งด้วย เพื่อให้เข้าสู่โหมดกรอกคีย์ใหม่ 100%
if forceUI then
    if delfile and isfile and isfile(KEY_FILE) then
        pcall(function() delfile(KEY_FILE) end)
    end
end

local preProvidedKey = explicitKey or ReadSavedKey()
if not forceUI and preProvidedKey and type(preProvidedKey) == "string" and preProvidedKey ~= "" then
    preProvidedKey = string.upper(string.gsub(preProvidedKey, "%s+", ""))
    local isValid, errReason = verifyKey(preProvidedKey)
    if isValid then
        SaveKeyToFile(preProvidedKey)
        print("[KrakenHub] License verified (" .. preProvidedKey .. ")! Loading script...")
        loadstring(game:HttpGet(GetScriptUrlForGame()))()
        return
    end
end

-------------------------------------------------------------------------------
-- [ 3. UI Key System สวยหรู โทน Dark มี Animation เคลื่อนไหว นุ่มนวล ]
-------------------------------------------------------------------------------
local CoreGui = game:GetService("CoreGui")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

pcall(function() if CoreGui:FindFirstChild("KrakenKeyUI") then CoreGui.KrakenKeyUI:Destroy() end end)

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "KrakenKeyUI"
ScreenGui.ResetOnSpawn = false
ScreenGui.DisplayOrder = 999999
ScreenGui.Parent = CoreGui

local function Tween(obj, props, duration, style, dir)
    duration = duration or 0.3
    style = style or Enum.EasingStyle.Quart
    dir = dir or Enum.EasingDirection.Out
    local tween = TweenService:Create(obj, TweenInfo.new(duration, style, dir), props)
    tween:Play()
    return tween
end

-- เงา Glow แสงนีออนพื้นหลัง
local GlowHalo = Instance.new("ImageLabel")
GlowHalo.Name = "GlowHalo"
GlowHalo.Size = UDim2.new(0, 500, 0, 360)
GlowHalo.Position = UDim2.new(0.5, -250, 0.5, -180)
GlowHalo.BackgroundTransparency = 1
GlowHalo.Image = "rbxassetid://5028857084"
GlowHalo.ImageColor3 = Color3.fromRGB(0, 160, 255)
GlowHalo.ImageTransparency = 1
GlowHalo.Parent = ScreenGui

-- กล่องหน้าต่างหลัก (Dark Frame)
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Size = UDim2.new(0, 420, 0, 275)
MainFrame.Position = UDim2.new(0.5, -210, 0.5, -115)
MainFrame.BackgroundColor3 = Color3.fromRGB(14, 15, 22)
MainFrame.BackgroundTransparency = 1
MainFrame.BorderSizePixel = 0
MainFrame.ClipsDescendants = true
MainFrame.Parent = ScreenGui

local MainCorner = Instance.new("UICorner", MainFrame)
MainCorner.CornerRadius = UDim.new(0, 14)

-- ขอบนีออน Gradient
local UIStroke = Instance.new("UIStroke", MainFrame)
UIStroke.Color = Color3.fromRGB(35, 45, 70)
UIStroke.Thickness = 1.3
UIStroke.Transparency = 1

local StrokeGradient = Instance.new("UIGradient", UIStroke)
StrokeGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 210, 255)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(35, 45, 75)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 140, 255))
}
StrokeGradient.Rotation = 45

-- ระบบลากหน้าต่าง (Draggable Window)
local dragging, dragInput, dragStart, startPos
MainFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPos = MainFrame.Position
        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then
                dragging = false
            end
        end)
    end
end)

MainFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
        dragInput = input
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if input == dragInput and dragging then
        local delta = input.Position - dragStart
        local targetPos = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
        Tween(MainFrame, {Position = targetPos}, 0.08, Enum.EasingStyle.Linear)
        Tween(GlowHalo, {Position = UDim2.new(targetPos.X.Scale, targetPos.X.Offset - 40, targetPos.Y.Scale, targetPos.Y.Offset - 42)}, 0.08, Enum.EasingStyle.Linear)
    end
end)

-- แถบสีด้านบนสุด
local TopBar = Instance.new("Frame", MainFrame)
TopBar.Size = UDim2.new(1, 0, 0, 3)
TopBar.Position = UDim2.new(0, 0, 0, 0)
TopBar.BorderSizePixel = 0
TopBar.BackgroundColor3 = Color3.fromRGB(0, 180, 255)
Instance.new("UICorner", TopBar).CornerRadius = UDim.new(0, 3)

local TopGradient = Instance.new("UIGradient", TopBar)
TopGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 255, 200)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 160, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(120, 50, 255))
}

-- Control Buttons Holder (Top Right)
local ControlHolder = Instance.new("Frame", MainFrame)
ControlHolder.Name = "ControlHolder"
ControlHolder.Size = UDim2.new(0, 68, 0, 28)
ControlHolder.Position = UDim2.new(1, -78, 0, 14)
ControlHolder.BackgroundTransparency = 1
ControlHolder.ZIndex = 10

local MinimizeBtn = Instance.new("TextButton", ControlHolder)
MinimizeBtn.Name = "MinimizeBtn"
MinimizeBtn.Size = UDim2.new(0, 28, 0, 26)
MinimizeBtn.Position = UDim2.new(0, 0, 0, 0)
MinimizeBtn.BackgroundColor3 = Color3.fromRGB(24, 27, 38)
MinimizeBtn.BorderSizePixel = 0
MinimizeBtn.Text = "-"
MinimizeBtn.TextColor3 = Color3.fromRGB(180, 190, 210)
MinimizeBtn.Font = Enum.Font.GothamBold
MinimizeBtn.TextSize = 16
MinimizeBtn.ZIndex = 11
MinimizeBtn.BackgroundTransparency = 1
MinimizeBtn.TextTransparency = 1
Instance.new("UICorner", MinimizeBtn).CornerRadius = UDim.new(0, 6)

local CloseBtn = Instance.new("TextButton", ControlHolder)
CloseBtn.Name = "CloseBtn"
CloseBtn.Size = UDim2.new(0, 28, 0, 26)
CloseBtn.Position = UDim2.new(0, 34, 0, 0)
CloseBtn.BackgroundColor3 = Color3.fromRGB(24, 27, 38)
CloseBtn.BorderSizePixel = 0
CloseBtn.Text = "x"
CloseBtn.TextColor3 = Color3.fromRGB(180, 190, 210)
CloseBtn.Font = Enum.Font.GothamBold
CloseBtn.TextSize = 14
CloseBtn.ZIndex = 11
CloseBtn.BackgroundTransparency = 1
CloseBtn.TextTransparency = 1
Instance.new("UICorner", CloseBtn).CornerRadius = UDim.new(0, 6)
-- Title & Subtitle
local Title = Instance.new("TextLabel", MainFrame)
Title.Size = UDim2.new(1, -110, 0, 32)
Title.Position = UDim2.new(0, 24, 0, 16)
Title.Text = "KRAKENHUB  •  KEY SYSTEM"
Title.TextColor3 = Color3.fromRGB(245, 247, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 15
Title.TextXAlignment = Enum.TextXAlignment.Left
Title.BackgroundTransparency = 1
Title.TextTransparency = 1

local SubTitle = Instance.new("TextLabel", MainFrame)
SubTitle.Size = UDim2.new(1, -110, 0, 18)
SubTitle.Position = UDim2.new(0, 24, 0, 46)
SubTitle.Text = "Sailueatarchiwa Edition | KrakenHub Security"
SubTitle.TextColor3 = Color3.fromRGB(110, 120, 145)
SubTitle.Font = Enum.Font.GothamMedium
SubTitle.TextSize = 11
SubTitle.TextXAlignment = Enum.TextXAlignment.Left
SubTitle.BackgroundTransparency = 1
SubTitle.TextTransparency = 1

-- Status Label
local StatusLabel = Instance.new("TextLabel", MainFrame)
StatusLabel.Size = UDim2.new(1, -48, 0, 20)
StatusLabel.Position = UDim2.new(0, 24, 0, 72)
StatusLabel.Text = "Please enter your active key to continue"
StatusLabel.TextColor3 = Color3.fromRGB(140, 150, 175)
StatusLabel.Font = Enum.Font.Gotham
StatusLabel.TextSize = 12
StatusLabel.TextXAlignment = Enum.TextXAlignment.Left
StatusLabel.BackgroundTransparency = 1
StatusLabel.TextTransparency = 1

StatusCallback = function(msg)
    StatusLabel.Text = msg
    StatusLabel.TextColor3 = Color3.fromRGB(255, 90, 90)
    -- เอฟเฟกต์สั่นเตือนเมื่อผิดพลาด (Shake)
    local origPos = MainFrame.Position
    Tween(MainFrame, {Position = UDim2.new(origPos.X.Scale, origPos.X.Offset - 6, origPos.Y.Scale, origPos.Y.Offset)}, 0.05)
    task.wait(0.05)
    Tween(MainFrame, {Position = UDim2.new(origPos.X.Scale, origPos.X.Offset + 6, origPos.Y.Scale, origPos.Y.Offset)}, 0.05)
    task.wait(0.05)
    Tween(MainFrame, {Position = origPos}, 0.05)
end

-- ช่องกรอก Key Box
local InputContainer = Instance.new("Frame", MainFrame)
InputContainer.Size = UDim2.new(1, -48, 0, 44)
InputContainer.Position = UDim2.new(0, 24, 0, 102)
InputContainer.BackgroundColor3 = Color3.fromRGB(20, 22, 32)
InputContainer.BorderSizePixel = 0
InputContainer.BackgroundTransparency = 1
Instance.new("UICorner", InputContainer).CornerRadius = UDim.new(0, 10)

local InputStroke = Instance.new("UIStroke", InputContainer)
InputStroke.Color = Color3.fromRGB(38, 44, 62)
InputStroke.Thickness = 1.2
InputStroke.Transparency = 1

local KeyInput = Instance.new("TextBox", InputContainer)
KeyInput.Size = UDim2.new(1, -24, 1, 0)
KeyInput.Position = UDim2.new(0, 12, 0, 0)
KeyInput.BackgroundTransparency = 1
KeyInput.PlaceholderText = "Paste your license key here..."
KeyInput.PlaceholderColor3 = Color3.fromRGB(80, 90, 115)
KeyInput.Text = (not forceUI and preProvidedKey and preProvidedKey ~= "") and preProvidedKey or ""
KeyInput.TextColor3 = Color3.fromRGB(240, 245, 255)
KeyInput.Font = Enum.Font.GothamMedium
KeyInput.TextSize = 13
KeyInput.ClearTextOnFocus = false
KeyInput.TextXAlignment = Enum.TextXAlignment.Left
KeyInput.TextTransparency = 1

KeyInput.Focused:Connect(function()
    Tween(InputStroke, {Color = Color3.fromRGB(0, 170, 255)}, 0.25)
    Tween(InputContainer, {BackgroundColor3 = Color3.fromRGB(24, 28, 40)}, 0.25)
end)

KeyInput.FocusLost:Connect(function()
    Tween(InputStroke, {Color = Color3.fromRGB(38, 44, 62)}, 0.25)
    Tween(InputContainer, {BackgroundColor3 = Color3.fromRGB(20, 22, 32)}, 0.25)
end)

-- ปุ่ม Check Key (ปรับขนาดเต็มความกว้าง)
local SubmitBtn = Instance.new("TextButton", MainFrame)
SubmitBtn.Size = UDim2.new(1, -48, 0, 40)
SubmitBtn.Position = UDim2.new(0, 24, 0, 160)
SubmitBtn.BackgroundColor3 = Color3.fromRGB(0, 150, 240)
SubmitBtn.Text = "Verify Key"
SubmitBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
SubmitBtn.Font = Enum.Font.GothamBold
SubmitBtn.TextSize = 13
SubmitBtn.BorderSizePixel = 0
SubmitBtn.BackgroundTransparency = 1
SubmitBtn.TextTransparency = 1
Instance.new("UICorner", SubmitBtn).CornerRadius = UDim.new(0, 9)

local SubmitGradient = Instance.new("UIGradient", SubmitBtn)
SubmitGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 190, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 120, 230))
}

-- ปุ่ม Discord / ซื้อkey
local DiscordBtn = Instance.new("TextButton", MainFrame)
DiscordBtn.Size = UDim2.new(1, -48, 0, 34)
DiscordBtn.Position = UDim2.new(0, 24, 0, 214)
DiscordBtn.BackgroundColor3 = Color3.fromRGB(20, 23, 34)
DiscordBtn.Text = "Discord Community / ซื้อ key"
DiscordBtn.TextColor3 = Color3.fromRGB(120, 140, 220)
DiscordBtn.Font = Enum.Font.GothamMedium
DiscordBtn.TextSize = 12
DiscordBtn.BorderSizePixel = 0
DiscordBtn.BackgroundTransparency = 1
DiscordBtn.TextTransparency = 1
Instance.new("UICorner", DiscordBtn).CornerRadius = UDim.new(0, 8)

-- Hover Effects ให้ทุกปุ่ม
local function AddHover(btn, normalColor, hoverColor)
    btn.MouseEnter:Connect(function()
        Tween(btn, {BackgroundColor3 = hoverColor}, 0.2)
        Tween(btn, {Size = btn.Size + UDim2.new(0, 0, 0, 2)}, 0.2)
    end)
    btn.MouseLeave:Connect(function()
        Tween(btn, {BackgroundColor3 = normalColor}, 0.2)
        Tween(btn, {Size = btn.Size - UDim2.new(0, 0, 0, 2)}, 0.2)
    end)
end

AddHover(SubmitBtn, Color3.fromRGB(0, 150, 240), Color3.fromRGB(0, 180, 255))
AddHover(DiscordBtn, Color3.fromRGB(20, 23, 34), Color3.fromRGB(32, 36, 52))

-- Animation เปิดหน้าต่าง (Entrance Smooth Animation)
task.spawn(function()
    Tween(MainFrame, {
        Position = UDim2.new(0.5, -210, 0.5, -137),
        BackgroundTransparency = 0
    }, 0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
    
    Tween(GlowHalo, {
        Position = UDim2.new(0.5, -250, 0.5, -180),
        ImageTransparency = 0.65
    }, 0.7)

    Tween(UIStroke, {Transparency = 0}, 0.5)
    Tween(Title, {TextTransparency = 0}, 0.4)
    Tween(SubTitle, {TextTransparency = 0}, 0.45)
    Tween(StatusLabel, {TextTransparency = 0}, 0.5)
    Tween(InputContainer, {BackgroundTransparency = 0}, 0.5)
    Tween(InputStroke, {Transparency = 0}, 0.5)
    Tween(KeyInput, {TextTransparency = 0}, 0.5)
    Tween(SubmitBtn, {BackgroundTransparency = 0, TextTransparency = 0}, 0.55)
    Tween(DiscordBtn, {BackgroundTransparency = 0, TextTransparency = 0}, 0.6)
    Tween(MinimizeBtn, {BackgroundTransparency = 0, TextTransparency = 0}, 0.5)
    Tween(CloseBtn, {BackgroundTransparency = 0, TextTransparency = 0}, 0.5)
end)

-- Button Click Events
local isMinimized = false
local normalSize = UDim2.new(0, 420, 0, 275)
local minimizedSize = UDim2.new(0, 420, 0, 70)

MinimizeBtn.MouseEnter:Connect(function()
    Tween(MinimizeBtn, {BackgroundColor3 = Color3.fromRGB(36, 42, 60), TextColor3 = Color3.fromRGB(0, 200, 255)}, 0.2)
end)
MinimizeBtn.MouseLeave:Connect(function()
    Tween(MinimizeBtn, {BackgroundColor3 = Color3.fromRGB(24, 27, 38), TextColor3 = Color3.fromRGB(180, 190, 210)}, 0.2)
end)

CloseBtn.MouseEnter:Connect(function()
    Tween(CloseBtn, {BackgroundColor3 = Color3.fromRGB(220, 50, 50), TextColor3 = Color3.fromRGB(255, 255, 255)}, 0.2)
end)
CloseBtn.MouseLeave:Connect(function()
    Tween(CloseBtn, {BackgroundColor3 = Color3.fromRGB(24, 27, 38), TextColor3 = Color3.fromRGB(180, 190, 210)}, 0.2)
end)

CloseBtn.MouseButton1Click:Connect(function()
    ScreenGui.Enabled = false
    pcall(function() ScreenGui:Destroy() end)
end)

MinimizeBtn.MouseButton1Click:Connect(function()
    isMinimized = not isMinimized
    if isMinimized then
        MinimizeBtn.Text = "+"
        Tween(MainFrame, {Size = minimizedSize}, 0.35, Enum.EasingStyle.Quart, Enum.EasingDirection.Out)
        Tween(GlowHalo, {Size = UDim2.new(0, 480, 0, 130)}, 0.35)
        Tween(StatusLabel, {TextTransparency = 1}, 0.15)
        Tween(InputContainer, {BackgroundTransparency = 1}, 0.15)
        Tween(KeyInput, {TextTransparency = 1}, 0.15)
        Tween(SubmitBtn, {BackgroundTransparency = 1, TextTransparency = 1}, 0.15)
        Tween(DiscordBtn, {BackgroundTransparency = 1, TextTransparency = 1}, 0.15)
        task.delay(0.2, function()
            if isMinimized then
                InputContainer.Visible = false
                SubmitBtn.Visible = false
                DiscordBtn.Visible = false
                StatusLabel.Visible = false
            end
        end)
    else
        MinimizeBtn.Text = "-"
        InputContainer.Visible = true
        SubmitBtn.Visible = true
        DiscordBtn.Visible = true
        StatusLabel.Visible = true
        Tween(MainFrame, {Size = normalSize}, 0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
        Tween(GlowHalo, {Size = UDim2.new(0, 500, 0, 360)}, 0.4)
        Tween(StatusLabel, {TextTransparency = 0}, 0.3)
        Tween(InputContainer, {BackgroundTransparency = 0}, 0.3)
        Tween(KeyInput, {TextTransparency = 0}, 0.3)
        Tween(SubmitBtn, {BackgroundTransparency = 0, TextTransparency = 0}, 0.35)
        Tween(DiscordBtn, {BackgroundTransparency = 0, TextTransparency = 0}, 0.35)
    end
end)

DiscordBtn.MouseButton1Click:Connect(function()
    fSetClipboard("https://discord.com/invite/vvkVDYeuhn")
    StatusLabel.Text = "Discord invite link copied to clipboard!"
    StatusLabel.TextColor3 = Color3.fromRGB(120, 180, 255)
end)

SubmitBtn.MouseButton1Click:Connect(function()
    local enteredKey = string.upper(KeyInput.Text:gsub("%s+", ""))
    if enteredKey == "" then
        StatusLabel.Text = "Please enter your key first!"
        StatusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
        return
    end

    StatusLabel.Text = "Verifying license with server..."
    StatusLabel.TextColor3 = Color3.fromRGB(255, 200, 0)
    SubmitBtn.Text = "Checking..."
    Tween(SubmitBtn, {BackgroundColor3 = Color3.fromRGB(0, 100, 180)}, 0.2)
    task.wait(0.2)

    local isValid, errReason = verifyKey(enteredKey)
    if isValid then
        SaveKeyToFile(enteredKey)
        StatusLabel.Text = "Key Accepted! Welcome to KrakenHub"
        StatusLabel.TextColor3 = Color3.fromRGB(0, 255, 160)
        SubmitBtn.Text = "Success!"
        Tween(SubmitBtn, {BackgroundColor3 = Color3.fromRGB(0, 200, 120)}, 0.3)
        
        -- Animation ปิดหน้าต่าง (Exit Smooth Animation)
        task.wait(0.6)
        Tween(MainFrame, {
            Position = UDim2.new(0.5, -210, 0.5, -165),
            BackgroundTransparency = 1
        }, 0.45, Enum.EasingStyle.Quart, Enum.EasingDirection.In)
        Tween(GlowHalo, {ImageTransparency = 1}, 0.4)
        Tween(Title, {TextTransparency = 1}, 0.3)
        Tween(SubTitle, {TextTransparency = 1}, 0.3)
        Tween(StatusLabel, {TextTransparency = 1}, 0.3)
        Tween(InputContainer, {BackgroundTransparency = 1}, 0.3)
        Tween(KeyInput, {TextTransparency = 1}, 0.3)
        Tween(SubmitBtn, {BackgroundTransparency = 1, TextTransparency = 1}, 0.3)
        Tween(DiscordBtn, {BackgroundTransparency = 1, TextTransparency = 1}, 0.3)
        Tween(MinimizeBtn, {BackgroundTransparency = 1, TextTransparency = 1}, 0.3)
        Tween(CloseBtn, {BackgroundTransparency = 1, TextTransparency = 1}, 0.3)
        task.wait(0.45)
        ScreenGui:Destroy()
        loadstring(game:HttpGet(GetScriptUrlForGame()))()
    else
        SubmitBtn.Text = "Verify Key"
        Tween(SubmitBtn, {BackgroundColor3 = Color3.fromRGB(0, 150, 240)}, 0.2)
        StatusLabel.Text = errReason or "Invalid or Expired Key! Please check again."
        StatusLabel.TextColor3 = Color3.fromRGB(255, 80, 80)
    end
end)
