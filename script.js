"use strict";
const get = id => document.getElementById(id);
const canvas = get("track");
let ctx=canvas.getContext("2d");
const TAU = Math.PI * 2, LAPS = 5, STEP = 1/120;
const BOMB_TIMEOUT=2;
function isDisabled(kart,time=elapsed) {return (kart.disabledUntil??0)-time>1e-8;}
const wrap = (x, n) => ((x % n) + n) % n;
const clamp = (x, a, b) => Math.max(a, Math.min(x, b));
const drivers = [
  { name:"Bulldog", color:"#ff8a41", portrait:"bulldog", max:233, grip:2.62, special:"Shoulder Check", bio:"Heavy contact racer. Use your special wheel to wheel to throw a rival off their line." },
  { name:"Silk", color:"#df5f89", portrait:"silk", max:243, grip:3.13, special:"Snap Drift", bio:"Bremse beim Lenken, um zu driften. Nach zwei Drifts bringt C einen langen Boost." },
  { name:"Checkers", color:"#c4e6ff", portrait:"checkers", max:252, grip:2.95, special:"Thread the Needle", bio:"Fahre durch Rivalen hindurch. Zwischen zwei Karts gibt es einen Boost." },
  { name:"Volt", color:"#6de7ff", portrait:"volt", max:247, grip:2.87, special:"Störpuls", bio:"Bremst Rivalen in deiner Nähe mit einem elektrischen Puls." },
  { name:"Patch", color:"#dcc679", portrait:"patch", max:234, grip:3.02, special:"Stahlpanzer", bio:"Schützt dich kurz vor Remplern und Öl." },
  { name:"Fuse", color:"#ff82cb", portrait:"fuse", max:249, grip:2.78, special:"Doppelschuss", bio:"Feuert gleichzeitig zwei Comic-Bomben in benachbarte Spuren." }
];
const items=[
  {id:"nitro",label:"NITRO",color:"#ffbb60"},
  {id:"bomb",label:"BOMBE",color:"#ff8172"},
  {id:"oil",label:"ÖL",color:"#c39afb"},
  {id:"scrambler",label:"STÖRPULS",color:"#83e9ff"}
];
const trackArt=["data:image/webp;base64,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","data:image/webp;base64,UklGRsANAABXRUJQVlA4ILQNAAAQMgCdASqlAE8APrlAmksnIyIhs90tUOAXCWwArk++AbfY+ZPZniW0nHV3y/fP/0nqF5rXon/dH1Gftv60/o0/2PpM9Rn6DXS3f4iwYcU3QSFrcL1Zd6PyF1AsPO1nANu5aXf6F6FvSc0qgUD7C2887BmDyKyTULROC0ExpC+tOxh6NVeSmlCclzpKJDah8wqVhPJXvD195hCUpwFQV+FnBOp2DmpoPJL60tlyLtXU+a566eJWfsrmtn/ZTZGSVF+IYneJup5RWVoTWmNsb6LiJtUOqeKYbHFzAhp1LXKqt7eGOHuViFZniR6L0nVp7d9ZLZSGn0QGnKbq25+NsyiA1Z77KceNsBRWZwmz2eBGqNOyeAis2D877TIewctw9hPIKsKphWt22X5zfXZticVrem6ag5N30bgE/Lg2SDlT++wK3Xg6zdfvXnI7uQOesDZaBvgd6eIIHG91Ppiuu4QuGwan/aq/Zd6O03Lr5pt9+wqNv8Cd/uWfCDXitUlZ1mHFY9ajI5YFqHxVFLw0HaaK//Uj/65AXTQAAP75Hycycsnln905z6LUTxtWhToPoh+lYHduRL8O7+uTvUOPyfbWRv8SELTt48J/qT4CwwSlbYk/pM53Q7QVuPbjeKXje2AfM7Lg4SaG6mtlP9KC+GEp5FOXYTdHbbl3Mjccy5zVkmGu0DYSGHeg/fs2uM//xtnhPtqhVotEAEhchsGIrPB6BuKr61wI27lAAaDzr+qhureRJpxT72o2OoxbFvP/G+HU3v283himUNCoDFANnnyc1T8+D3dCjPJ8nGnqEUf44tTtLf/c9PR33209IWYW7gT75LYmNZkdTSgs/SplfVvuj08N/XD+KqDntvLj+ncrxRooOedHAz6VJtpm2Xg5TZvc0lPBOLHw/HtNyZZwuWKOfkjGG9AGgIfjwLg8Ziio5G2Z2lPhW2+kGGEM8UseA/XTNtKfPnH9pbfPjyQU0BJPmpwRW24H0lPHm4nbIuipKyNQLbjAzRFsePLxgAfGTd0JOnD1unIGOcC5vbVy1iBaGX4EsrtJ7kuILbC8WdGOJ7SVGeQkA1yHwroFH0u2ZjCejQRrGgjtRktguseEOJzIxLh5S/Opeczg4a0Jy9lDfRI+aaXicgaA9zPVoS55jB8R1hftMvOa9coJEavw/2nnjjDk2wUzogm+XFBqlxEgLq+skkR5miDIGAY+1M2plcQFihai3KZfDHO+pJxb3oSyXZ0E44zQqXf7Bqw+jeAX7Nq/JdJ5SVVucQwTbPJgEHgwJuHZsVw4hFVSDMdy40H+D4wfwYoRofjKG6PO3jF523iJDJE2lVxcYR7Q2BVW6dSpnrmPaIaTK9INjoiN8NKJ2Dcs8Vp+H0Nlc99e93ucbeKrgjpI6D4gV0PcMJfriV5FH7ycz9SzbWcjVAVVoWGm5RsCCgGLD89XsgxsAS3zsXQeeXCA6Sm+0XJyJuTHMO/wLa312YhDWUx/xGePC1Zhq7Vr/7fIkF1XDwO6U2oo3EmjbkQ2LpkGOCf9R3slZYCBlH8e0eDqeCOlgAlTXiBaIRLxDgFAA6pWwSTHoxtD0mq6XUVB/rD0ag3DMht8T3yuAFwGjDcqT/MYqwHBjIS+CRx9nA3UQLxg3TnH4es96x+aAZEJ4Uauu2dWPh9bhjkrUuY8ThYZGud83rtdVNTIqty0PRUQyPuCe2jpVpoVj0a/tJfPM9cAqEPrHyHZUs806gHCOOzt8Arb/KuteEri6P+eYaJ6nh3UXDEwg8N3tKfwAPBAU5ESUoifH5itYRM8YyCKX9nO1QWo5aYfmlIePz0zvuAqeF0H0ITsLpFkT+FLOcRvU2mZhc4rMxEjoLX3bLhs6GxlgoMgi1Ur/QGjxqgxVsT7W7Y8RbxMJ8ZJIxzvhmb13pRBfLyZppO2nFBK2lLEeOeAZf51FbNr9K8NayanPIdCPRDbD5Dbj3LbTwH+O7MqAOuHnGvOAwsWgJfv5kNHADYYDXVjHqnAOoRNH2K+oG9Sqw1Wmz9436gjB+JkU4Tvg/FLGBaYw9TDnudkmXKAiGXuKW7CmUSk82u8FtxfRF8UcPxOwDR0Ig/USEmI+P7K3s69g4UvCyuIo/smjUj2IC8BUz7md4vXdm51p9voL3I/wNGXXaxJM5Te8fDWySnFgpcrnIhIOwfV7wWbG0vqp0clvsimIxCxBGI8P8dFcxAJS6PGYcyuRhq7GEA6LzHPcr2WHROKMjA3V3839MEUW2R7UbgJuOwsFvbm8rJUY1NcVxmKbULICEn7eYZp6pKQCMKaQa6oeEUdWD1bkZna4NCHnAJE6ukIyXpvzbGbt0WpgP5MhDVrhqRzQ5ROSgibxu3DKZky+g6jZSHrmsSopWQksq6XhmRVc4jFf4qtclqSTADwMQEPgWanLqjI8+kVNuRwdV1M90vOaNfieISJqcxfn4L+Zu44zY+MEr74grvHAF3V+fhyoh/Zr1JPjgeV9DK/OBZh6uytoH1YXgQcT8CbCRTHCtCk927tohwZ0pSPCZi6Sd5qq4Js1+v+4v1eWzbDZaySiSPpGmN0JDZ63TMMrGr2ArdzYKWRvYD87wy2k6dX0/oFBd5+J5p53PGX7jeobIubsXPJSYlDh/+1VPPUaaeGkfwSRMdiqrMSVjN1BihJQ+E76aDN6yz72I3a0aRDRpiS5cxauXCc5dEyUgEpNO5RN48dkgNMJw0VUt7OOSpwmph0HmZFlSdFRq9yb8HXSQqPZ/dCEKwHGtpoOY0pl51tL8yRzQBpHvCf81G6vBfscNQBThn2dj63U1G094ReymsRIwTkCgnockhBtvgAfe2CBfEXwfv8VOd50jNIo/dpPMtqXHzTnX5aqkYgEmbzw5lW381OC0mBM8xNVcldY9dxoLBQoZpFM+4p4yMVhEeZJqFjMrSLITy5gd7aK8ApX+vSxhEhg67V3IDIFCkOp8LO+XONZy+fDyeWlEvxg5j5vgFcfu68uHnkDIhLf/A/VgxEE6BX0IytNgQ8gFTF1dJvtYtajQpKqkrRf/jQcnwgdulyFL3MUF35AOMZa40emtTuQxSV8Kh2JU55ASqmCd6drLVOj1swWYAYXIEoDCz00H7jEK/Js+XrClrOX+UTlPw0RoOgtHo6/K4T18aAsKmyh7YXXRgs62YvydF64qRnh4XyZAyaBWmIRX090+TdPvvb7656w1Vb+OXV2wKko4A1yOvE/zr7eFoelsdE+iHXTm/S38WPKpOF+HB7MC/3goi6SSHdr0Gh3Zab0ID2oTVoN6ic5BVB3rIvqczJod1opaHbwO1XGYH6CJ3tmmW9uFKjS31eSkWrPiAmOa8rnaCvRnkaOY6UyZrhGj9dTkK9BtJw0qgOQMs5x7jtWUqhAEZvfjq8dt4FPp+pcR/FAv7n0vhtu8Bijv65PmO7Bx5Fe8Tws07YnzCbg+fRucwDYM+QDb7jQdgSh7e1wL8az1WcrQgymrm1RUwz/2JYMAQkruLfKUcfgrWnpqCdZzsqwK+nKGa8KWkAub6WS5j25KozPkRgcvnqU3UpOqE3qyXLCmkLXyMmKosQ1VZacwJFhFN1aNjZaoeaoLXuPiMEgYnkVhE29BNDvnBFg9Nz9rWtrkS2X8KqGPNR3MwgXG0cYKUhW50pxbGgJFQLMnzxVvFyyvaOSuV14SaIirw5iCyk5hyVZxeje8gl12COSqT5iT+VBQdAW04NRsv3a7Uv7KvjFQxg1r7eB0sFo0CPQTuc7+XF3Tt3q3DozyHzCIpHm4eX71DfmlGFex5a4RqHXGAcDpXC4zJ7CYzZJvuXt+Pvo9B1bN8vGqoQ+uzWq++ZXKSdqrzZo74EyC9ndJwYWKwq62DpCKqr4hTH6S7gWzIZ0MWbkvwspVjcPAEeq/GLYt22ER+vUqXXxjfRkxk6Rd26NkNtf0yOTYCq8o6qup3Dq1XSHtHcLdgkSrtZiwc54CjVN2BoqauAsLW+4/yESuc2/unYNmA/NrsR+QTOvWwgSEDN39QoJkcin0ux5b+9a4AJndMTktK0PRsd1/8Tjeq07nLW+GRgNYFN9Qugb7KcftgafZpu/qM41g7slLfK3qAAzfrT5pybqx5MMsxHHzo7w12IHR1y/sCUqK7QQK1OlDq6URUqjLnfxYL/9s8MxpHB+nYb+yq6k45hvsU7gijffypOsdviYg/3iCO5PvJOXyeDZLNeVm300+Xm68Z/h9Wan2yPj9kjFfRJDTBXR9E+CtemqAY6mNobWQ7oMwwaBW51XefI796S4EhGDgn6/B5gtN47l2WI8I2jofh3qdKemaWGoCuvNna7RDDjgYKCg3fFHZoVrudYmLk0tvvUonVrZ61xjIBsgFUDubDwZpDH5ucpfgFFQms08oPnJmss6so9zlLAGNvYvXkvDIE7/giRcP12oj3XtJp6tR1Mh65huqab4KKPmDgn6zIyCmluocqCSHAwDvvjMeuvR6trUFKDf7ySqyzj3QjSWRLPg95cOMjK8LWRm6CuIvcMXV9sVbYtUwMPBBtnls/Bqpn3CAd1lI6KrCi7cbCeWBkk6MrEHefe7LFrga7+Pz6atckhbJ97l27u1Av2Ffrk92GTu2/UW2KHjBCsBMWCLFZGhOr06wECghn6KwnSamCie3YeJWACX+uC/y/IP0A2Y/dN7MSyuvJvS6h5AAAA","data:image/webp;base64,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","data:image/webp;base64,UklGRrIKAABXRUJQVlA4IKYKAAAQLQCdASqlAE8APslKnksno6KhsFkt6PAZCWwAs3fjkp+Y/CuR/eDeMZhf0XfA/53qj5sPpo8zvni+d1vtG9Nf5GgZdHIb9yHVx3x8ALEntvwCbt+nF0AOL42VXKoBAtkRaczTh+gKHiYm2B1pXBcQkPezXk0BYiZruYNYjyndMNLf/tiBNkA6iUz+knP68j0KTdv2KzLzoYdt7e99/TctZV/Dkj7jdSbivtFsLT9/+ctlO4lFgUB3TFV1vB0LL+v5OLXuiomtYj/yRYqLJd8U7IZgv/+2OX4zN6fvtoO9wHUTnto+NolM93QilCi/XZKjAjSYpdArhNs5vXm2xPdcKw6WEv8YLFRgT9XetDeQA4kbL7gVE0EAHgm4wTYZSGx5EUbzIDDz3E90npw7yF2IIzwrvtY3KiKr2a+HT1DssLlwtfE/S9Erq/577NmnhUi66f39YH++yfrXgBmiQZgL0wgfTV+B0STU8VVPLP6qkAAA/vkL0I8i8P1B4S8ZTn3prvznVvxHx7RCxNCv49aN1Cvvz/F5qkL17L0Ms2Ky2c9UxJCsvTKd6CmR0aaz208OQW9XuDr0SKt3S0pGODUdy45aCkQtISIdf/i0Dl/l/gbZzGV2XqC+ViBbPnCWR3eKNYer3mqaa7mY6/nweHCdT5DDcdDXzQcrtUZtf9GYif98lu7X6nLxypePqPzEnALCqX9SLH/F67/iUIacoIB60yVQf99c2UlBO5XfB8daIiTeVspf6jxtMauUJ/hdLpiX3EWqWYo4UwzaT8DRdV6ocmPX6wsx8ItKH2+k/znme+5Y13FJpjgAR0mNaMedWa2RFy6VHr13i5asn0jo3DWYrh76ps5/zvdCMueWqqsY9Vvl6Q4ARtwXU5f4YbpJR7hGM0yqT5TuSagKe1hCq/EmJdJZbwOGtg6T6AusYJ5sk5PbqZYOza956YTWJdClI2hB74yPTSrB1ptIQwCAV/HzXTYK5mZLjGo5cJl2M7lejfu8+0PQfpIhwS2BZOu5RzX/J+Yw/BCosF0vOQ3fQSqwiwBrlsBolqILe9PS/fH22juZ++MzpobyC9+vEyZqxngxM9TY6bPAPsT+KQ7JpMscLHr3B89e48p5ATwWHisaCLlVw2aHIMK96V9KM32nFVBgH0NrOHYZkQxSgmQmv5vnIucc6ICSNWqXM6MqOpAyECQ8nyyiYfuyoI4V0QlQhZIRnj61khN7uneYabUSbJLHVAtIioWSoD8MazlAt9LdzfHzPIu7SxFeyJYKtLnHSf2ncdiIka5ALrqau2+qbPdzJXSOIOWWX8lEt7MU3Evx/pdVvvU9dwxwxM3jsQggOfJU88gOFuO1Y/GLeP164cj2wx9fIh3zB50ut7KzXn8OBNFbW2hgFnXaGrzqtsQf6odjb8ctIWhjH9yoFSiw3rB6Ok2calDiIIIJ/ZJtBXh61XBVUTZsXSdXDD+2duRDsDH3CEHIo9GAWvOhNDQmfUOgDveTvixbjoG6spSz6c/NHSkRqhPS9pLBvSmkfmeTv/4UPAbGaCK+Y3eUd8Pb1G6M06tiuHcMtCUncfifi2fZpKC1n40AV0XhzmF3ok/JkvOKZGuBIKB7yIraqTK9j2dJfvGGeZe9rbsbMZ2YamXhWvWKEmH/AAyOzqennEGf4n+8pEdflQf0vLCRCRUlEb+J7tO7d7kJvy1GXpFduIoj8a/A29VRfdH3mw3H7RmAbUv/62yKsOdiLnpD+WVOqHoW1IGjnq+Iu8WhC8bXiRDwUowu3hlrt0pcXIkbdtOIHp0zDzrT+bLA6EjV3+05nU3Uw5DTFCRuo3wk2PpNkJ+zUlyMQoKTWvgSiogOEY67MAvfLEBAb02vsHV41TveOEneC7WMSoXfmMKJdP/VZwHToW9qvhIsr6ZglkuCUXxZaN8Vdqd9rOUgamqwqqEO83Cwz8mPSJrRpKIMwrEqAnwjR5nYBxFD5lorQc9dp5goumdM8Ntl3xvKMiMVTblWBfhbfQl59qrdABib1zPqWVBQGDV84Ez1wpGtkuCi3svQgja2tsAnHnHGf9ZsjwV78rRjilP5CyBFRZkK10KIsgycWqVILVrKW5O0rj/2GBYbMHimx0ccLpxeXGp6+d2m+dGMDorE3iDgFFRP0OOE0VcGwfdoYTzZ+G27pbrQiWq5Yl5BZLo8XIUUsA7nzzMtzPEZhQIyFp3Xxfj1tEPsbSGKBPXOwRKtQ0IyEPgSkctOxPxUH3bfyawF0bbqit6R/P6vLwGwin5CTLyqHfCW2yRZ1SVImOqtItnyjnibEqv+KnK+GR9JPMWerZCyhgNfYKGX+wDXunfdD+CjOrZyLT8wT1t8y3HyWDLpLlPlDTxPM6/feeahDvPigyUb9MpBd1Ta8TuOSIsV6leSqlZUvv7iZhQ8aQYwMFOOrS4jlj1twYrt9HIiBxWzSlKcqCeTjFHYbL7dppFvVWF7PZEDRlXvzxUms/VLpQIVTWN1LINJp2+6wEL2VG1F+BQS8f3xJWTD+nO/Xzli/Gc4tXjAgy0EghXWs4R1LmgmORk6YI2YtcvvisP2f5YDnPMSzWxiCUrQkZXHQS4uO0GYX+buGqlAJRKXEr7a/7yWpnKOrK6HkILK3PFNRlzjXJMmUlbuio8y/CFE+i3AXogQOiJ2oTMn1Sj5Wyj+UkX2Rnsq/BPbsIQLXupa1tI7yIV9fq+/+77JEeGpaiiaP9hA71SzfcxxpAWFSXfWCIKfXyPy4zKjvaRKAIIwus0rgQsRT64l6T+5DO86soXfqJbHYXpUgRBiuHVkD/DUeBJ8Wb87/xKf5wdoHv5AOi/7l6M/GVzZrlFeDJ+xs0TAZyITETBQmpJIv265FjCqRjGykA6+2woBkJJ9IuAcIySgC6tCRpgzXUUAbTgmFP80vVWg4XQS7Y/3JxaGsH6k8z9x1kN6vYAZgSZnelLhFWQl4XibUbWLxn0N4i3YewrODV5csr/QXhCOD/mI+3LqNDVYrrDifIevDBGI3DJjtSdAlcllszQJQNa3m+I5rDMWtIk/nZLKGTct0FQGfnMVOvq3BfB8aZDWkIPILmcYom3clCgCvRZtYlLhoHF/ojiOaMSqJhOg0p69Mwz0O9kVylMhXYfHLe/jiHShv4p5apa8Wytetjh23fG5gQ/45j6kEUFVAzfgX7mKp0IXR2dCVodahPO3F9f5YwweuEUhgcYjpSRVaeTajhjNOsua4WQeKc5hbWkzveNqmMKg7Ovu6spWCTLCA6HzGT3xW00M6hawV9IiFdapeT7OHSTtKzwuiuzC6hb6eO0Cc/80NNux5yxGa+6IsLE6snKAvno3M+sUWFli528TUVroT5T/d2DEJJ+2W56RfRabZYNLkc8KIbkKplLbkgVsPASuaRn7o8M4bTtI0X0eRIf9JM4NS68tiqeDDmCtMFUwAp8WcX71bjthwiAuuAwGjQG8p3HBzI7sRMj8/OpoxjPRh9SBfAubn1o4gdWEpJinEO5x2/+ZjagV9KcwVM2SHUA7fft2UcZAeSPfyZBrWXjZE6ZvrvlZw3onFJioSVCd4SCKsWRJdRCvEqmOqN7Z0pj6s+fYzF+kHnkgkez11YkPt3ZTLzUhSEHnuKHjKaz4EN4ADMAAAA==","data:image/webp;base64,UklGRogKAABXRUJQVlA4IHwKAADwLACdASqlAE8APslSoEsnpKMhsNcrsPAZCWgAxQxH7bVMfa2iz1ffg+Rr9v3tv+L6o9v75m/PH88DfXuip9ZL/WWDPid55Qqzj+qnvnwU8JzpVQNu56fJqNWqjkWwYqLwmrBr2JPZqTWC0W+jbAoll5vKZwvLgnrcBlEbXC0OKw3XT2OaQ8KByN3zEDzcxM2dlI4gJEVGNLKDYkYxS2943ZYkSC5JxpCLeHBbXTqJweEtY5fe8TqCFggu77Z0GX5NhJnr6oCCZmbb+aK/gaPfj8SZxgdnjVU41GQVc/dP+rFK0IGFFad59hyL+VOiDUOBMQ4bysfQpvSVk6EXs2MjjvAXJ2Pa9M77JU7fOTZIXKKBEIoruef5jAhG31ANaiZcu/q/4hzT+ris31n1xaqjdAIV2rETewxKngH98kcU5KSYIFuXACrSrhrOlQLTVky8Yj84C7lJLVfunIV97GlGMeAK7gtfVVbHUN9wjNiUAAD++xfMWiBCUOWlJz8XA6EqcLbkgN5HHvf6izWJjFw6/ygOd3XtHcPTelsL7b8eJH0nUoAki1yHOOj0ADSdaZNmx8qlFPsrUNv/aERKcRNA9gXjemXbSrmV2D2EsRytoIMkpL8DD15cv2+2get9xDHRrSP1h4ZbnxqXlhOY+3FN/Mvhh47BikQny3x73muP9MFVF7iz9UCoLVThoNxcK/UEIVDENlYMB1aVXlQETwlemnhlCmQ+4ncYaqI3xydNFNIVxAvlHnClo1Yut7FFoanDuRl78iNI7M83i95zS7qIi+0IIR8qUd+c07PsYFlzcZr9VpeXakH+/npn98KUwF6NW6twLFPw9Qc4aFzB1rlIWdwh2TvQKgBg0EplZ3QNppuwn1nGRWv/23ojAqPUgznoSQqZcYhjX+KHs57Y419e09d1OJ6W1YhgDokl9xW8R8SRIxPdOutUAe6D3mBPqRBU0SHgzUf2qhh9Nd2jhko85W3QytyA/uZkc8+p8UPTXTkrFnioQxZTyutln/Oc6y+hw9cQyLsFFo6ntWAaW+DuSqOMOSsngWqM8xGPU9Sqe1jdI6IiivE1NdkZVmiiEdjfb3DUP8q6QLO1I1ansk9cB1WLMIt/9nTO3YfTDHUtlHiToK8T6HnUlfVr1iw6zgiEWpbTwqatlXvb/yMvbt8C7URT1getHSUvOsvA0eBTuHpw2Ecdny+d+tHT/qlArepFtmsubqReTmXrtNNXBIATvN0fDUMmX4CC7r/g4Ew7y1dT9a6AWzzncd00ZzFGR6Ysmi/AxNOlBlLEoBXI/cXETYnHKA248C9jaGb+Rmy0yA4lHCoKuiP6sEUfCSf7wsK+yVJH6waNefkCdTIfUiHzt0e7RL0VkH4kQ73tmD3YQ3JmIKSxGTXgcAGNJV4FO4RASq8rFRLbQkgLDQZiJAT1c8PEjxoaa8Yu3CSHy6DtunBwk4Rqidwlcbcd1hmgq3r3Ra8aX9zafqEttvI/NfLvMZ9+E/3c1Yy+M65QpbjHTOMAH4MHk1TlUwzj7WPPPSnIBzhuTeVKPNVxLHjFY724ODzJ0B86x3WacHZy2kYHZ+bq6xYdiC0EsfbiXbOUfe8FOl0NlIekltz4k/hmZZ+bdEtMM86MVJT6gGlogxCKPASjCrx0mOo8nzLK4aSwbFwYajOExDZkU2cqxIwTEQ5HsAC7gI2UPL4SrkKuExuDwZ/HcURkbe9jRfFqb+/P4TV9E8Hlcp4D4u7NH6eQ2mfXg0VB0TjsG1Stuhg9n5wWVIIaS30lQEAidsYbaTYroRzmU/jnYM3ie1Yt43fCZv++0L0VSFYjnstJD2CF7e1X7H5YpUZWkdkWXF3A4duhShR2iDRDDvl/le2PkHwxnWL7BlOgmUBon0eThJBlOdzI2ujGPCow20XmvrDitra9SvlldvPQO4008rqOa7x57Z2jxDzEMW1X9HAIqu0/BinS9+qJuOeGkKIyXRJ+PtcbzqNnBZA1q8iDpmH754m3cshuYMR8/fRSE9iE4LM2M1dXPg6E/EJH36TrBVJU3exrWT/b6BvPKWScko0EljsRThhM1ZUqTrCeOj5jMVpCHYvK0dtqXVgwEGu8hQI/jZ8i4prDvkhLbh5rxOfzut8MY7s/ELfot92L4h1TckBnDyzUZ5mJKTDItW8JokRawJbkwzn77Wh/ksOsb5dTnvpwNHURYQs3CptG2z09avtg9MAQ2neLjOTnnebzoLPVy4wSku1oXcmSIE1gnCf8U6s/PqZ57zBU3cdGVIh17cl/75QNTlvxu4d2aIwEbwfKUuG3XcJr/3BE+FJ7wrngbyhMSXCP+FupV8tMCT3CIWTR8hR75QpiRl/gkZlRtpGooPCwPngjHO0xtgYjMYB/5ha9J93c5oCWd8N/PN3sAhhQIpd9GiWgJgtnzYd6zuIyp7kdtvPoVkQFMylVHNs2xP1A1hkVoRCIAyJ2GWFFbWu0AZEIU9iI+R34jSDV01B37N5DIiBdYrgjnCV+OJj2uc1zqwWBKAvKc9JOuEVe5zrwRBOBOowY+kUTagGnENBpQLwUFd8+DA6QtlUyS4PgXNPn+TM0q05FZumZnPtl7zq5kU/ANl26hm6Dmn14CHy7kNKSyn86F7/rIW/0SK5lP+afv+Wx55wtm5MRxoOHPFblMWMPxGrD0i6rabIBpKgO0fwwNOHv9XOIvKzPvxgy2yshjDi2wJ3VHpe6d9PdW/JnbH+yvB5xoZItCDcO2htSOPbF4liyLDbng46tb4iErhWflB59JtxU7o/411QiQdsUN+m5rx/94WX6fOQR8fHfvSiavjidRQ/zp7sboHHbhCvXVCZddcSUo3zg1NNXg2ilsO9KLDsQJG82aWqDGpjsrCv2Ho6BfvJVW3KW7YBlqivWhlnEOEteRxuJ11vg+RmJN5sko9ZIKRUCXC+kX/BR03vkgiVE0fD+0DwdATizRmoruyLUGwFVFkbmG6shasDxoLf9HBz70SozACssEv9H1iFRX6UU6dpZY7P2BewWCLLAQzM9AclRiNmvgjmOREvWQTvcrTcKoSnXHgmlBMGhuHX6gZ7BqhUlDYQ1FJ2CGvxSr8kFXMDk4rgwbi1r8XQk3HyxbycW1Z4rDk2aLEouMymcuGBlKyb/+kGdqN16/pNY6CqCbCKSj3PSNGDL5nv+68/Bwz8zY+HsO7j4SzBkC2bUhT9fXYl7Z/oKbLdMw3mnWkoZsuHfDqhYqRJ8J6P5eBSLXtGSrClv93A4k8EUrWQG0qc8dVla2pWrblZxpCUxK0rawIwTmUhOCLCzmfPr21Z+mmeet/Q0/we56wNReil2ECcauSZLRQ++wo20JMtc7MV3HMOrgmbE5y/PfQUosmhmLZ57W9a75CL9zbQv5Ui9ulygaiD9mxYb0AAEl76xaUyY82PvowtRhzWfgHxn81X6mQ6FEAxZnCtDMwD3OZqn/eymo1skCJO7N8yKAhpfuJuxXFlM5lfSeCBu9vmiUaGyFD9AQHPXLmk2Z+UsvTACHXqcP+WOpQ9jEkxqgNPmQTqN8Y+x2rBUw8KIrw7/9XBYGddIknlTtNZwLVAAAA==","data:image/webp;base64,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"];
const panoramas=trackArt.map(src=>{const image=new Image();image.src=src;return image;});
const circuits=[
  {id:"T01",name:"Freight Loop",note:"Breite Geraden im Frachthafen",theme:["#111b2b","#1e2739","#2f3040","#2d2a32","#383a44","#c88955"],points:[[270,570],[500,571],[850,571],[1130,565],[1310,510],[1375,400],[1310,277],[1190,227],[970,208],[748,185],[500,160],[240,172],[108,242],[73,363],[112,490],[171,550]]},
  {id:"T04",name:"Canyon-Truckstop",note:"Vollgas zwischen Felswänden",theme:["#32263c","#704453","#c0735a","#704c49","#4a4148","#f7bd78"],points:[[230,606],[580,622],[1050,611],[1330,500],[1390,319],[1180,234],[950,110],[650,107],[380,173],[190,238],[95,425]]},
  {id:"T06",name:"Nachtmarkt",note:"Neonlichter und versetzte Stadtkurven",theme:["#1e112c","#3c1540","#692f57","#452a44","#4c4056","#ff779d"],points:[[245,630],[530,616],[975,610],[1342,562],[1442,377],[1310,270],[1070,270],[987,97],[651,90],[361,142],[170,327],[120,509]]},
  {id:"T08",name:"Höhenstraße",note:"Anstieg und zwei weite Kehren",hill:43,theme:["#0e1c35","#202d4a","#465066","#29383d","#383b45","#f3b86d"],points:[[238,770],[580,770],[1010,737],[1350,655],[1430,480],[1260,382],[990,470],[620,518],[476,410],[635,310],[975,284],[1190,212],[1140,95],[795,67],[390,134],[151,286],[81,543]]},
  {id:"T13",name:"Parkhaus",note:"Betondecks mit ansteigender Rampe",hill:49,indoor:true,theme:["#161821","#353843","#575760","#383741","#484952","#e2d4aa"],points:[[237,683],[565,687],[1020,670],[1300,560],[1390,375],[1250,200],[1000,130],[718,130],[548,224],[542,365],[371,423],[228,348],[117,460],[130,600]]},
  {id:"T16",name:"Industriebrücke",note:"Zwei Brückenquerungen bei Sonnenaufgang",bridge:true,theme:["#492f51","#985e67","#e58b69","#303e59","#433d51","#ffbf77"],points:[[234,612],[500,556],[830,478],[1120,408],[1350,334],[1410,175],[1260,81],[1020,155],[730,242],[427,310],[168,411],[100,550]]}
];
let trackIndex=0;
let path=[],length=0,mapBounds;
const ROAD=91, PICKUP_RESPAWN=3;
function sampleLayout(points) {
  const samples=[];
  for(const [i,b] of points.entries()) {
    const [a,c,d]=[-1,1,2].map(j=>points[wrap(i+j,points.length)]);
    for(let j=0;j<12;j++) {
      const t=j/12;
      samples.push({x:spline(a[0],b[0],c[0],d[0],t),y:spline(a[1],b[1],c[1],d[1],t)});
    }
  }
  return samples;
}
let loadedCircuit=-1;
function loadCircuit(index) {
  if(loadedCircuit===index) return;
  loadedCircuit=index;
  trackIndex=index;needsDraw=true;
  const circuit=circuits[index];
  path=sampleLayout(circuit.points);
  length=0;
  for(const [i,a] of path.entries()) {
    const b=path[(i+1)%path.length];
    a.s=length;a.dx=b.x-a.x;a.dy=b.y-a.y;
    a.len=Math.hypot(a.dx,a.dy);length+=a.len;
  }
  mapBounds={
    left:Math.min(...path.map(p=>p.x))-30,top:Math.min(...path.map(p=>p.y))-30,
    right:Math.max(...path.map(p=>p.x))+30,bottom:Math.max(...path.map(p=>p.y))+30
  };
  pads.length=0;boostStrips.length=0;
  for(const [i,fraction] of [.21,.72].entries()) {
    const progress=length*fraction;
    const lane=(i%2?1:-1)*(ROAD-22);
    boostStrips.push({progress,lane});
  }
  const spots=[[-39,39],[0],[-41,41],[0]];
  for(const [i,fraction] of [.11,.33,.57,.80].entries()) {
    for(const [j,lane] of spots[i].entries()) {
      const progress=length*fraction;
      pads.push({...at(progress,lane),progress,lane,readyAt:0,item:items[(i+j+index)%items.length]});
    }
  }
  useScenery(index);
  viewAngle=undefined;
}

function spline(a,b,c,d,t) {
  return .5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
}
function at(s,lane=0) {
  const p=wrap(s,length);
  let low=0,high=path.length-1;
  while(low<high) {
    const mid=Math.ceil((low+high)/2);
    if(path[mid].s<=p) low=mid; else high=mid-1;
  }
  const a=path[low], t=(p-a.s)/a.len;
  const h=(circuits[trackIndex].hill||0)*(.5-.5*Math.cos(p/length*TAU*2));
  const next=path[(low+1)%path.length];
  const ax=a.dx/a.len, ay=a.dy/a.len, bx=next.dx/next.len, by=next.dy/next.len;
  const angle=Math.atan2(ay+(by-ay)*t,ax+(bx-ax)*t);
  return {x:a.x+a.dx*t-Math.sin(angle)*lane,y:a.y+a.dy*t+Math.cos(angle)*lane,h,angle};
}
const pads=[], boostStrips=[];
let state="menu", selected=0, player, rivals=[], elapsed=0, countdown=0;
const bestTimes=new Map(), bestMedals=new Map();
const skidMarks=[];
let frameTime=null, accumulator=0, needsDraw=true, noticeTime=0, bannerTime=0, lapStart=0, oil=[], bombs=[], sparks=[], pulses=[], position=1;
const keys=new Set(), pointers=new Map(), actions=new Set();
let steerNudge=0;
const keyControls={
  ArrowUp:"gas",KeyW:"gas",ArrowDown:"reverse",KeyS:"reverse",ArrowLeft:"left",KeyA:"left",
  ArrowRight:"right",KeyD:"right",Space:"brake",KeyE:"item",KeyC:"special"
};
function held(action) {
  for(const key of keys) if(keyControls[key]===action) return true;
  for(const control of pointers.values()) if(control===action) return true;
  return false;
}
function syncControls() {
  for(const button of document.querySelectorAll("[data-hold]")) button.dataset.active=held(button.dataset.hold);
}
function clearControls() {keys.clear();pointers.clear();actions.clear();steerNudge=0;syncControls();}
window.addEventListener("keydown",event=>{
  if(state!=="race" && state!=="paused") return;
  if(event.code==="Escape") {
    if(!event.repeat) state==="paused"?resume():pause();
    return;
  }
  const action=keyControls[event.code];
  if(!action || state!=="race") return;
  event.preventDefault();
  keys.add(event.code);
  if(!event.repeat&&action==="left") steerNudge=-1;
  if(!event.repeat&&action==="right") steerNudge=1;
  if(!event.repeat && (action==="item"||action==="special")) actions.add(action);
  syncControls();
});
window.addEventListener("keyup",event=>{keys.delete(event.code);syncControls();});
window.addEventListener("blur",()=>{if(state==="race") pause();});
document.addEventListener("visibilitychange",()=>{
  frameTime=null;accumulator=0;
  if(document.hidden&&state==="race") pause();
});
for(const button of document.querySelectorAll("[data-hold]")) {
  button.addEventListener("pointerdown",event=>{
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,button.dataset.hold);
    if(button.dataset.hold==="left") steerNudge=-1;
    if(button.dataset.hold==="right") steerNudge=1;
    syncControls();
  });
  for(const type of ["pointerup","pointercancel","lostpointercapture"]) {
    button.addEventListener(type,event=>{pointers.delete(event.pointerId);syncControls();});
  }
}
for(const button of document.querySelectorAll("[data-tap]")) {
  button.addEventListener("click",()=>{if(state==="race") actions.add(button.dataset.tap);});
}
function choose(index) {
  selected=index;
  for(const [i,button] of [...get("drivers").children].entries()) button.setAttribute("aria-pressed",i===index);
  get("bio").textContent=drivers[index].bio;
}
for(const [i,driver] of drivers.entries()) {
  const button=document.createElement("button");
  button.className="driver";
  button.innerHTML='<span class="portrait '+driver.portrait+'"></span><b>'+driver.name.toUpperCase()+'</b>';
  button.addEventListener("click",()=>choose(i));
  get("drivers").append(button);
}
choose(0);
function courseChoice(index) {
  loadCircuit(index);
  for(const [i,button] of [...get("courses").children].entries()) button.setAttribute("aria-pressed",i===index);
  const goal=goalsForTrack(), medal=bestMedals.get(index);
  get("courseDescription").textContent=circuits[index].note+" · "+LAPS+" Runden · Gold "+formatTime(goal.gold)+(medal?" · Bestmarke "+medal:"");
}
for(const [i,course] of circuits.entries()) {
  const button=document.createElement("button");
  button.className="course";
  const p=sampleLayout(course.points);
  const minX=Math.min(...p.map(point=>point.x));
  const minY=Math.min(...p.map(point=>point.y));
  const w=Math.max(...p.map(point=>point.x))-minX;
  const h=Math.max(...p.map(point=>point.y))-minY;
  const coords=p.map(point=>point.x.toFixed(0)+","+point.y.toFixed(0)).join(" ");
  button.innerHTML='<img class="course-preview" alt="" src="'+trackArt[i]+'"><canvas class="course-preview" width="232" height="104" hidden aria-label="Streckenvorschau"></canvas><svg aria-hidden="true" viewBox="'+(minX-110)+' '+(minY-85)+' '+(w+220)+' '+(h+170)+'"><polygon points="'+coords+'" fill="none" stroke="'+course.theme[5]+'" stroke-width="36" stroke-linejoin="round"/><circle cx="'+p[0].x+'" cy="'+p[0].y+'" r="45" fill="#fff2cf"/></svg>'+course.id+" · "+course.name;
  button.onclick=()=>courseChoice(i);
  get("courses").append(button);
}
function openCourses() {
  get("timeout").hidden=true;
  state="courses";clearControls();player=undefined;needsDraw=true;
  oil=[];bombs=[];pulses=[];sparks=[];skidMarks.length=0;
  get("menu").hidden=true;get("overlay").hidden=true;get("hud").hidden=true;
  get("controls").hidden=true;get("raceBanner").hidden=true;get("notice").textContent="";
  get("courseDriver").textContent=drivers[selected].name.toUpperCase()+" / 5 RUNDEN";
  get("courseMenu").hidden=false;courseChoice(trackIndex);
  get("courses").children[trackIndex].focus();
  drawPreviews();
}
get("courseBack").onclick=()=>{
  state="menu";get("courseMenu").hidden=true;get("menu").hidden=false;get("start").focus();
};
get("raceStart").onclick=()=>start();
get("changeTrack").onclick=openCourses;
function say(message,duration=1.4) {
  get("notice").textContent=message; noticeTime=duration;
}
function banner(title,detail="",duration=Infinity) {
  const box=get("raceBanner");
  box.textContent=title;
  if(detail) {
    const line=document.createElement("small");
    line.textContent=detail;box.append(line);
  }
  box.hidden=false;bannerTime=duration;
}
function goalsForTrack() {
  const base=length*LAPS/238;
  return {gold:base,silver:base*1.095,bronze:base*1.23};
}
function raceMedal(time) {
  const goal=goalsForTrack();
  return time<=goal.gold?"GOLD":time<=goal.silver?"SILBER":time<=goal.bronze?"BRONZE":"";
}
function formatTime(seconds) {
  const tenths=Math.floor(seconds*10);
  return Math.floor(tenths/600)+":"+((tenths%600)/10).toFixed(1).padStart(4,"0");
}
let sound=null,muted=readMute(),fallback=null,fallbackReady=false,audioRequested=false,audioBlocked=false;
function readMute() {
  try {return window.localStorage?.getItem("blacktop-muted")==="1";} catch {return false;}
}
function activateSound() {
  unlockAudio();
  if(sound?.context.state==="running") tone(415,780,.22,.25,"triangle");
  else playFallback(480);
}
function showMute() {
  const button=get("mute");
  button.textContent=muted?"TON AUS":sound?.context.state==="running"||fallbackReady?"TON AN":audioBlocked?"TON ERNEUT TESTEN":"TON TESTEN";
  button.setAttribute("aria-pressed",String(muted));
  button.setAttribute("aria-label",muted?"Ton einschalten":"Ton stummschalten");
}
function setMute(next) {
  muted=next;
  if(muted) fallback?.pause();
  showMute();
  try {window.localStorage?.setItem("blacktop-muted",muted?"1":"0");} catch {}
  if(!muted) unlockAudio();
  if(sound) sound.master.gain.setTargetAtTime(muted?0:.48,sound.context.currentTime,.015);
  if(muted) updateAudio();
}
get("mute").onclick=()=>{
  if(!muted&&sound?.context.state!=="running"&&!fallbackReady) {activateSound();return;}
  setMute(!muted);
  if(!muted) activateSound();
};
showMute();
window.addEventListener("keydown",event=>{
  if(event.code==="KeyM"&&!event.repeat) setMute(!muted);
});
function unlockAudio() {
  if(!muted) audioRequested=true;
  if(muted) return;
  const Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio) {audioBlocked=true;showMute();return;}
  if(!sound) {
    try {
      const context=new Audio();
      const master=context.createGain();
      master.gain.value=.48;
      master.connect(context.destination);
      const motor=context.createOscillator(), harmonic=context.createOscillator();
      const filter=context.createBiquadFilter(), engine=context.createGain(), texture=context.createGain();
      motor.type="triangle";harmonic.type="sawtooth";filter.type="lowpass";engine.gain.value=0;texture.gain.value=.22;
      motor.connect(filter);harmonic.connect(texture);texture.connect(filter);
      filter.connect(engine);engine.connect(master);
      motor.start();harmonic.start();
      sound={context,master,motor,harmonic,filter,engine};
    } catch {audioBlocked=true;showMute();return;}
  }
  if(sound.context.state==="running") showMute();
  if(sound.context.state!=="running"&&sound.context.state!=="closed") sound.context.resume().then(()=>{audioBlocked=false;showMute();}).catch(()=>{audioBlocked=true;showMute();});
}
const sampleCache=new Map();
function wav(pitch) {
  if(sampleCache.has(pitch)) return sampleCache.get(pitch);
  const rate=11025,total=2600;
  const bytes=new Uint8Array(44+total*2),view=new DataView(bytes.buffer);
  for(const [offset,word] of [[0,"RIFF"],[8,"WAVE"],[12,"fmt "],[36,"data"]]) {
    for(let i=0;i<word.length;i++) bytes[offset+i]=word.charCodeAt(i);
  }
  view.setUint32(4,36+total*2,true);view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);
  view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);view.setUint32(40,total*2,true);
  for(let i=0;i<total;i++) {
    const chunk=Math.min(1,i/100)*(1-i/total)**2;
    view.setInt16(44+i*2,Math.floor((Math.sin(i/rate*pitch*TAU)+Math.sin(i/rate*pitch*TAU*1.99)*.22)*chunk*12000),true);
  }
  let binary="";
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  const uri="data:audio/wav;base64,"+btoa(binary);
  sampleCache.set(pitch,uri);return uri;
}
function playFallback(pitch) {
  if(muted||document.hidden||typeof Audio==="undefined") return;
  try {
    fallback??=new Audio();
    fallback.src=wav(clamp(Math.round(pitch/90)*90,90,1080));
    fallback.currentTime=0;
    fallback.play().then(()=>{fallbackReady=true;audioBlocked=false;showMute();}).catch(()=>{audioBlocked=true;showMute();});
  } catch {audioBlocked=true;showMute();}
}
let activeVoices=0;
function tone(from,to,duration,volume,type="sine",delay=0) {
  if(muted||document.hidden) return;
  if(!sound||sound.context.state!=="running") {if(audioRequested&&!delay) playFallback(from);return;}
  const {context,master}=sound;
  if(activeVoices>=10) return;
  const at=context.currentTime+delay;
  const oscillator=context.createOscillator(), level=context.createGain();
  oscillator.type=type;
  oscillator.frequency.setValueAtTime(from,at);
  oscillator.frequency.exponentialRampToValueAtTime(to,at+duration);
  level.gain.setValueAtTime(.001,at);
  level.gain.exponentialRampToValueAtTime(volume,at+.012);
  level.gain.exponentialRampToValueAtTime(.001,at+duration);
  oscillator.connect(level);level.connect(master);
  activeVoices++;
  oscillator.onended=()=>{activeVoices=Math.max(0,activeVoices-1);oscillator.disconnect();level.disconnect();};
  oscillator.start(at);oscillator.stop(at+duration+.02);
}
document.addEventListener("pointerup",()=>{
  if(state==="race"&&!muted&&sound?.context.state!=="running") unlockAudio();
});
function updateAudio() {
  if(!sound||sound.context.state!=="running") return;
  const active=state==="race"&&!muted&&!document.hidden&&!!player;
  const speed=active?Math.abs(player?.v||0):0;
  const rpm=58+speed*.40+(active&&held("gas")&&!isDisabled(player)?12:0);
  const now=sound.context.currentTime;
  sound.motor.frequency.setTargetAtTime(rpm,now,.065);
  sound.harmonic.frequency.setTargetAtTime(rpm*2.02,now,.065);
  sound.filter.frequency.setTargetAtTime(150+speed*3.5,now,.08);
  sound.engine.gain.setTargetAtTime(active?(isDisabled(player)?.035:countdown>0?.15:.18+Math.min(speed/1500,.16)):0,now,.055);
}
function start() {
  unlockAudio();
  clearControls();
  viewAngle=undefined;accumulator=0;
  const s=-72;
  player={...at(s,19),progress:s,lastGate:-1,lane:19,v:0,lateral:0,bank:0,item:null,boost:0,slip:0,ghost:0,
    stripLock:0,cooldown:0,chain:0,chainTime:0,driftTime:0,impact:0,color:drivers[selected].color,driver:selected};
  const grid=[[-71,-25],[-104,37],[-104,-37],[-137,50],[-137,-50]];
  rivals=drivers.map((driver,index)=>({driver,index})).filter(entry=>entry.index!==selected)
    .map(({driver,index},i)=>{
      const [progress,lane]=grid[i];
      return {...at(progress,lane),progress,lane,baseLane:lane,pace:driver.max*.81,color:driver.color,slow:0,boost:0,stripLock:0,item:null,useAfter:0,shove:0,i,driver:index};
    });
  for(const pad of pads) pad.readyAt=0;
  oil=[];bombs=[];sparks=[];pulses=[];skidMarks.length=0;elapsed=0;lapStart=0;countdown=3;
  get("menu").hidden=true;get("courseMenu").hidden=true;get("overlay").hidden=true;get("hud").hidden=false;get("controls").hidden=false;
  get("timeout").hidden=true;
  get("notice").textContent="";noticeTime=0;banner("3",circuits[trackIndex].name.toUpperCase()+" · "+LAPS+" RUNDEN");
  state="race";hud();
  tone(315,315,.12,.19,"triangle");
  document.activeElement?.blur();
}
function pause() {
  if(state!=="race") return;
  state="paused";fallback?.pause();updateAudio();accumulator=0;clearControls();get("raceBanner").hidden=true;showOverlay("PAUSE","",true);
}
function resume() {
  unlockAudio();
  state="race";if(bannerTime>0) get("raceBanner").hidden=false;get("overlay").hidden=true;get("controls").hidden=false;get("resume").blur();
}
function showOverlay(title,detail,canResume) {
  get("controls").hidden=true;get("overlay").hidden=false;
  get("resultTrack").textContent=circuits[trackIndex].name.toUpperCase();get("result").textContent=title;get("resultDetail").textContent=detail;get("resume").hidden=!canResume;
}
get("start").onclick=openCourses;get("retry").onclick=start;get("pause").onclick=pause;get("resume").onclick=resume;
get("garage").onclick=()=>{
  get("timeout").hidden=true;
  state="menu";clearControls();viewAngle=undefined;needsDraw=true;get("overlay").hidden=true;get("hud").hidden=true;
  get("notice").textContent="";get("raceBanner").hidden=true;get("menu").hidden=false;get("start").focus();
};
function nearby(radius) {
  return rivals.map(r=>({r,dist:Math.hypot(r.x-player.x,r.y-player.y)}))
    .filter(pair=>pair.dist<radius&&pair.r.finishedAt===undefined&&Math.abs(courseGap(pair.r.progress,player.progress))<radius*1.4&&Math.abs(pair.r.h-player.h)<18).sort((a,b)=>a.dist-b.dist).map(pair=>pair.r);
}
function shove(r,force) {
  const side=-Math.sin(r.angle)*(r.x-player.x)+Math.cos(r.angle)*(r.y-player.y);
  r.shove+=(side<0?-1:1)*force; r.slow=Math.max(r.slow,.75);
  burst(r.x,r.y,"#ffd27d",9,r.h);
}
function burst(x,y,color,count=9,h=0) {
  for(let i=0;i<count&&sparks.length<260;i++) {
    const a=Math.random()*TAU, v=24+Math.random()*105;
    sparks.push({x,y,h,dx:Math.cos(a)*v,dy:Math.sin(a)*v,t:.22+Math.random()*.32,color});
  }
}
function courseGap(a,b) {return wrap(a-b+length/2,length)-length/2;}
function fireBomb(lane,owner=player) {
  const progress=owner.progress+26;
  bombs.push({...at(progress,lane),progress,lane,owner,life:1.8});
}
function hitNotice(kart,text) {
  if(kart===player) say(text);
  else if(kart.driver!==undefined) {
    kart.hitText=text;kart.hitUntil=elapsed+.8;
  }
}
function audibleNear(kart,radius=310) {
  return player&&Math.abs(courseGap(kart.progress,player.progress))<radius;
}
function hasArmor(kart) {
  return kart===player&&selected===4&&kart.impact>0;
}
function canTakeBombHit(kart) {
  return !(kart.ghost>0||hasArmor(kart)||isDisabled(kart));
}
function disableKart(kart) {
  if(!canTakeBombHit(kart)) return false;
  kart.disabledUntil=elapsed+BOMB_TIMEOUT;
  kart.v=0;kart.lateral=0;kart.shove=0;kart.boost=0;kart.draft=0;kart.slip=0;
  if(kart===player) {
    kart.driftTime=0;steerNudge=0;actions.clear();hitNotice(kart,"BOMBENTREFFER");
  } else hitNotice(kart,"BUMM!");
  return true;
}
function explodeBomb(bomb) {
  if(audibleNear(bomb)) {tone(158,37,.32,.29,"sawtooth");tone(96,34,.38,.19,"triangle");}
  pulseAt(bomb,78,"#ffab64");
  pulseAt(bomb,46,"#fff0a7");
  const p=at(bomb.progress,bomb.lane);
  burst(p.x,p.y,"#ffd493",34,p.h);
  burst(p.x,p.y,"#db6756",17,p.h+5);
  for(const kart of [player,...rivals]) {
    if(kart!==bomb.owner&&kart.finishedAt===undefined&&Math.abs(courseGap(kart.progress,bomb.progress))<83&&Math.hypot(kart.x-p.x,kart.y-p.y)<77&&Math.abs(kart.h-p.h)<18) {
      disableKart(kart);
    }
  }
}
function scramble(radius) {
  pulse(radius,"#83e9ff");
  for(const rival of nearby(radius)) {
    rival.slow=Math.max(rival.slow,1.75);
    hitNotice(rival,"BZZT!");
    burst(rival.x,rival.y,"#a9dcff",12,rival.h);
  }
}
function useItem(kart=player) {
  const item=kart.item;
  if(!item) {if(kart===player) say("KEIN ITEM");return;}
  if(kart===player||audibleNear(kart,160)) {
    const volume=kart===player?.17:.075;
    const cue={nitro:[155,520,.45],bomb:[290,80,.17],oil:[180,68,.25],scrambler:[850,190,.21]}[item.id];
    tone(...cue,volume,"triangle");
  }
  if(item.id==="nitro") {kart.boost=Math.max(kart.boost,2.2);pulseAt(kart,68,item.color);}
  if(item.id==="bomb") fireBomb(kart.lane,kart);
  if(item.id==="oil") {
    const progress=kart.progress-34;
    oil.push({...at(progress,kart.lane),progress,owner:kart,t:18});
  }
  if(item.id==="scrambler") {
    if(kart===player) scramble(185);
    else {
      pulseAt(kart,185,item.color);
      for(const target of [player,...rivals]) {
        if(target===kart||Math.hypot(target.x-kart.x,target.y-kart.y)>=185||Math.abs(target.h-kart.h)>=18) continue;
        if(target===player) {
          if(player.ghost<=0&&!(selected===4&&player.impact>0)) {player.v*=.76;say("STÖRPULS-TREFFER");}
        } else {target.slow=Math.max(target.slow,1.4);hitNotice(target,"BZZT!");}
      }
    }
  }
  burst(kart.x,kart.y,item.color,18,kart.h);
  if(kart===player) say(item.label);
  kart.item=null;
}
function pulseAt(p,radius,color) {
  pulses.push({x:p.x,y:p.y,h:p.h,radius,color,life:.5});
}
function pulse(radius,color) {
  pulseAt(player,radius,color);
}
function useSpecial() {
  if(player.cooldown>0) {say("SPEZIAL LÄDT");return;}
  if(selected===0) {
    const rival=nearby(78).find(r=>Math.abs(Math.cos(player.angle)*(r.x-player.x)+Math.sin(player.angle)*(r.y-player.y))<39);
    if(rival) {shove(rival,145);say("SHOULDER CHECK");}
    player.impact=Math.max(player.impact,1.8);
    if(!rival) {player.boost=Math.max(player.boost,.8);say("RAMMSCHUTZ");}
  } else if(selected===1) {
    if(player.chain<2) {say("2 DRIFTS: LENKEN + BREMSE");return;}
    player.chain=0;player.boost=Math.max(player.boost,2.4);
  } else if(selected===2) {
    let left=false,right=false;
    for(const r of nearby(92)) {
      const cross=-Math.sin(player.angle)*(r.x-player.x)+Math.cos(player.angle)*(r.y-player.y);
      if(cross<-6) left=true;
      if(cross>6) right=true;
    }
    player.ghost=1.35;
    if(left&&right) {player.boost=Math.max(player.boost,1.8);say("THREAD THE NEEDLE");}
    else say("GEISTSPUR");
  } else if(selected===3) {
    scramble(230);say("STÖRPULS");
  } else if(selected===4) {
    player.impact=3;player.slip=0;say("STAHLPANZER");
  } else {
    const center=clamp(player.lane,-ROAD+29,ROAD-29);
    fireBomb(center-19);
    fireBomb(center+19);
    say("DOPPELSCHUSS");
  }
  pulse(78,player.color);player.cooldown=6;
  tone(210+selected*29,585+selected*32,.27,.16,"triangle");
  if(selected===1) say(drivers[selected].special.toUpperCase());
  burst(player.x,player.y,player.color,14,player.h);
}
function showText(id,text) {
  const el=get(id);
  if(el.textContent!==text) el.textContent=text;
}
function updateTimeoutHud() {
  const timeout=get("timeout");
  if(!timeout) return;
  timeout.hidden=!isDisabled(player);
  if(!timeout.hidden) showText("timeout","BOMBENTREFFER · "+Math.max(0,player.disabledUntil-elapsed).toFixed(1)+" s");
}
function hud() {
  updateTimeoutHud();
  const lap=clamp(player.lastGate+1,1,LAPS);
  position=1+rivals.filter(r=>player.finishedAt===undefined
    ?r.finishedAt!==undefined||r.progress>player.progress
    :r.finishedAt!==undefined&&r.finishedAt<player.finishedAt).length;
  showText("lap",String(lap+" / "+LAPS));
  showText("position",String(position+" / "+drivers.length));
  showText("speed",String(Math.round(Math.abs(player.v)*.68)));
  get("boostHud").hidden=!(player.boost>0||player.draft>.06);
  if(player.boost>0||player.draft>.06) showText("boostReadout",player.boost>0?"BOOST":Math.floor(player.draft*100)+"% SOG");
  showText("item",String("E · "+(player.item?.label||"KEIN ITEM")));
  get("item").classList.toggle("loaded",!!player.item);
  const label=player.cooldown>0?Math.ceil(player.cooldown)+" s · LÄDT":selected===1&&player.chain<2?"DRIFTS "+player.chain+"/2":drivers[selected].special.toUpperCase();
  showText("special",String("C · "+label));
  get("special").classList.toggle("loaded",player.cooldown<=0&&(selected!==1||player.chain===2));
}
function segmentEntry(x,y,dx,dy,halfX,halfY) {
  let enter=0,exit=1;
  for(const [start,change,half] of [[x,dx,halfX],[y,dy,halfY]]) {
    if(change===0) {
      if(Math.abs(start)>half) return Infinity;
      continue;
    }
    const a=(-half-start)/change,b=(half-start)/change;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>exit) return Infinity;
  }
  return enter;
}
function collectPickups(karts) {
  for(const pad of pads) {
    if(pad.readyAt>elapsed) continue;
    let winner, earliest=Infinity, closest=Infinity;
    for(const kart of karts) {
      if(kart.item||kart.finishedAt!==undefined||isDisabled(kart)) continue;
      const forward=kart.progress-kart.previousProgress;
      const start=wrap(kart.previousProgress-pad.progress+length/2,length)-length/2;
      const lateralTravel=kart.lane-kart.previousLane;
      // Intersect the kart motion with the pickup rectangle in track coordinates.
      if(Math.abs(start)<=16&&Math.abs(kart.previousLane-pad.lane)<=22) continue;
      const fraction=segmentEntry(start,kart.previousLane-pad.lane,forward,lateralTravel,16,22);
      if(fraction===Infinity||fraction>earliest) continue;
      const lateral=Math.abs(kart.previousLane+lateralTravel*fraction-pad.lane);
      if(fraction===earliest&&lateral>=closest) continue;
      winner=kart;earliest=fraction;closest=lateral;
    }
    if(!winner) continue;
    winner.item=pad.item;pad.readyAt=elapsed+PICKUP_RESPAWN;
    winner.useAfter=elapsed+.65+Math.random()*.85;
    burst(pad.x,pad.y,pad.item.color,12,pad.h);
    if(winner===player) {say(pad.item.label+" · E");tone(480,840,.16,.17,"sine");}
  }
}
function checkBoostStrip(kart,dt) {
  kart.stripLock=Math.max(0,kart.stripLock-dt);
  if(kart.stripLock||kart.progress<=kart.previousProgress) return;
  for(const strip of boostStrips) {
    const x=courseGap(kart.previousProgress,strip.progress);
    if(segmentEntry(x,kart.previousLane-strip.lane,kart.progress-kart.previousProgress,kart.lane-kart.previousLane,12,13)===Infinity) continue;
    kart.stripLock=1.4;kart.boost=Math.max(kart.boost,.9);
    pulseAt(kart,47,"#8aecff");
    if(kart===player) {say("TURBOSTREIFEN",.65);tone(150,630,.31,.16,"triangle");}
    return;
  }
}
function updateDraft(kart,dt) {
  const gap=rivals.some(r=>r.finishedAt===undefined&&r.progress-kart.progress>31&&r.progress-kart.progress<106&&Math.abs(r.lane-kart.lane)<15);
  kart.draft=clamp((kart.draft||0)+(gap&&kart.v>120?dt*.60:-dt*1.5),0,1);
  if(kart.draft<1||kart.boost>0) return;
  kart.draft=0;kart.boost=.8;
  say("WINDSCHATTEN",.72);
  tone(210,510,.20,.12,"triangle");
}
function update(dt) {
  if(countdown>0) {
    if(!held("gas")) player.earlyGas=false;
    else if(countdown>.42) player.earlyGas=true;
    countdown=countdown<=dt+1e-9?0:countdown-dt;
    if(countdown===0) {
      const launch=held("gas")&&!player.earlyGas;
      if(launch) player.boost=.85;
      banner("LOS!",launch?"PERFEKTER START":"",.9);tone(470,930,.31,.24,"triangle");
    }
    else {
      const title=String(Math.ceil(countdown));
      if(get("raceBanner").firstChild?.textContent!==title) {banner(title,circuits[trackIndex].name.toUpperCase()+" · "+LAPS+" RUNDEN");tone(315,315,.12,.20,"triangle");}
    }
    return;
  }
  const disabled=isDisabled(player);
  player.previousAngle=player.angle;player.previousV=player.v;player.previousLateral=player.lateral;
  elapsed+=dt;
  if(bannerTime>0 && (bannerTime-=dt)<=0) get("raceBanner").hidden=true;
  for(const key of ["boost","cooldown","slip","ghost","impact","chainTime"]) player[key]=Math.max(0,player[key]-dt);
  if(player.chainTime===0) player.chain=0;
  if(noticeTime>0 && (noticeTime-=dt)<=0) get("notice").textContent="";
  const spec=drivers[selected];
  const turn=Number(held("right"))-Number(held("left"))||steerNudge;
  if(Math.abs(player.v)>5) steerNudge=0;
  const shoulder=clamp((Math.abs(player.lane)-(ROAD-16))/20,0,1);
  const off=shoulder>.55;
  const drifting=held("brake")&&turn!==0&&player.v>63&&!off&&!player.slip;
  if(drifting) {
    if(player.driftTime===0) tone(280,115,.22,.105,"sawtooth");
    player.driftTime+=dt;
    if(Math.random()<dt*35) burst(player.x,player.y,"#c9bbac",1,player.h);
  } else if(player.driftTime>0) {
    if(selected===1&&player.driftTime>.19 && player.chain<2) {
      player.chain++;player.chainTime=player.chain===2?25:15;
      say("DRIFT "+player.chain+" / 2",.65);
    }
    player.driftTime=0;
  }
  const gas=held("gas"), brake=held("brake"), reverse=held("reverse");
  player.braking=brake||(reverse&&player.v>0);
  const cap=spec.max-(spec.max-140)*shoulder+(player.boost>0?105*(1-.55*shoulder):0);
  if(disabled) player.v=0;
  else if(brake) {
    const decel=drifting?100:520;
    player.v=Math.sign(player.v)*Math.max(0,Math.abs(player.v)-dt*decel);
  } else if(reverse) {
    player.v=Math.max(-63,player.v-dt*(player.v>0?440:110));
  } else if(gas||player.boost>0) {
    if(player.v<cap) player.v=Math.min(cap,player.v+dt*(player.v<0?420:player.boost>0?330:211));
  } else {
    player.v*=Math.exp(-.88*dt);
  }
  if(player.v>cap) player.v=Math.max(cap,player.v-dt*275);
  const speedRatio=clamp(Math.abs(player.v)/120,0,1);
  const grip=spec.grip/3;
  const heading=at(player.progress+42).angle;
  const curve=wrap(heading-player.angle+Math.PI,TAU)-Math.PI;
  const push=-curve*Math.min(1,(player.v/260)**2)*(drifting?34:17);
  const edge=clamp((Math.abs(player.lane)-ROAD+8)/15,0,1);
  const steering=turn*Math.sign(player.v);
  const outward=steering!==0&&Math.sign(player.lane)===Math.sign(steering);
  const target=push+steering*speedRatio*(drifting?144:119)*grip*(player.slip>0?.34:1)*(outward?1-.64*edge:1);
  const response=player.slip>0?2.3:drifting?6.8:13;
  if(disabled) player.lateral=0;
  else player.lateral+=(target-player.lateral)*(1-Math.exp(-response*dt));
  player.previousLane=player.lane;
  const nextLane=player.lane+player.lateral*dt;
  player.lane=clamp(nextLane,-ROAD-7,ROAD+7);
  if(player.lane!==nextLane) player.lateral=0;
  const previous=player.progress;
  player.previousProgress=previous;
  player.progress+=player.v*dt;
  const finish=length*LAPS;
  const playerFinished=previous<finish&&player.progress>=finish;
  if(playerFinished) {
    player.finishedAt=elapsed-dt+dt*(finish-previous)/(player.progress-previous);
    player.progress=finish;
  }
  const gate=Math.floor(player.progress/length);
  if(gate>Math.floor(previous/length) && gate>=0 && gate>player.lastGate) {
    player.lastGate=gate;
    const fraction=(gate*length-previous)/Math.max(1e-9,player.v*dt);
    const crossing=elapsed-dt+dt*clamp(fraction,0,1);
    const previousLapStart=lapStart;
    const lapTime=formatTime(crossing-previousLapStart);
    lapStart=crossing;
    if(gate===0) player.startedAt=crossing;
    else {
      if(gate<LAPS) {tone(440,520,.13,.13);tone(650,780,.19,.145,"triangle",.12);}
      player.bestLap=Math.min(player.bestLap??Infinity,crossing-previousLapStart);
    }
    if(gate===0) banner("RUNDE 1 / "+LAPS,"START / ZIEL",1.5);
    if(gate>0&&gate<LAPS) banner(gate===LAPS-1?"LETZTE RUNDE":"RUNDE "+(gate+1)+" / "+LAPS,"RUNDE "+gate+" · "+lapTime,2.25);
  }
  if((drifting||(brake&&player.v>110))&&elapsed>=(player.nextSkid||0)) {
    player.nextSkid=elapsed+.037;
    const start=player.previousProgress-12,end=player.progress-12;
    for(const side of [-8,8]) {
      const l=player.lane+side,prev=player.previousLane+side;
      skidMarks.push([at(start,prev),at(start,prev+1.5),at(end,l+1.5),at(end,l)]);
    }
    if(skidMarks.length>260) skidMarks.splice(0,skidMarks.length-260);
  }
  player.bank+=(turn-player.bank)*(1-Math.exp(-10*dt));
  Object.assign(player,at(player.progress,player.lane));
  for(const r of rivals) {
    if(r.finishedAt!==undefined) continue;
    if(isDisabled(r,elapsed-dt)) {r.previousProgress=r.progress;r.previousLane=r.lane;continue;}
    r.previousProgress=r.progress;r.previousLane=r.lane;r.previousAngle=r.angle;r.previousV=r.v||0;
    r.slow=Math.max(0,r.slow-dt);r.boost=Math.max(0,r.boost-dt);
    if(r.item&&elapsed>=r.useAfter) useItem(r);
    r.shove*=Math.exp(-2.7*dt);
    let target=r.baseLane+Math.sin(r.progress/96+r.i*1.9)*10;
    if(!r.item) {
      let nearest=155;
      for(const pad of pads) {
        const ahead=wrap(pad.progress-r.progress,length);
        if(pad.readyAt<=elapsed+ahead/r.pace && ahead+Math.abs(pad.lane-r.lane)*.8<nearest) {
          nearest=ahead+Math.abs(pad.lane-r.lane)*.8;target=pad.lane;
        }
      }
    }
    // Pick a side around the nearest kart rather than queueing bumper to bumper.
    let blocker=null, gap=62;
    for(const other of [player,...rivals]) {
      if(other===r||other.finishedAt!==undefined) continue;
      const ahead=courseGap(other.progress,r.progress);
      if(ahead>5&&ahead<gap&&Math.abs(other.lane-r.lane)<22) {blocker=other;gap=ahead;}
    }
    if(blocker) {
      const side=Math.abs(r.lane)>ROAD-28?-Math.sign(r.lane):r.i%2?1:-1;
      target=blocker.lane+side*31;
    }
    target=clamp(target,-ROAD+12,ROAD-12);
    r.lane=clamp(r.lane+(target-r.lane)*dt*2.8+r.shove*dt,-ROAD,ROAD);
    const catchup=clamp((player.progress-r.progress)/1100,-.055,.085);
    r.previousLateral=r.lateral??0;r.lateral=(r.lane-r.previousLane)/dt;
    r.v=r.pace*(r.slow>0?.55:r.boost>0?1.36:1)*(1+catchup+.045*Math.sin(r.progress/160+r.i));
    r.progress+=dt*r.v;
    if(r.progress>=finish) {
      r.finishedAt=elapsed-dt+dt*(finish-r.previousProgress)/(r.progress-r.previousProgress);
      r.progress=finish;
      Object.assign(r,at(r.progress,r.lane));
      continue;
    }
    Object.assign(r,at(r.progress,r.lane));
    if(!disabled&&player.ghost<=0&&player.impact<=0) {
      const dx=player.x-r.x,dy=player.y-r.y,d=Math.hypot(dx,dy);
      if(d<20&&Math.abs(player.h-r.h)<18) {
        const side=-Math.sin(r.angle)*dx+Math.cos(r.angle)*dy;
        const direction=side<0?-1:1;
        player.lane=clamp(player.lane+direction*(21-d),-ROAD-7,ROAD+7);
        Object.assign(player,at(player.progress,player.lane));
        player.lateral=direction*60;player.v*=.83;player.impact=.34;
        r.shove-=direction*43;
        tone(123,44,.15,.20,"triangle");
        burst(player.x,player.y,"#ffbd69",5,player.h);
      }
    }
  }
  for(const kart of [player,...rivals]) {
    if(kart.finishedAt===undefined&&!isDisabled(kart,elapsed-dt)) checkBoostStrip(kart,dt);
  }
  if(!disabled) updateDraft(player,dt);
  if(player.v>65&&player.v<160&&player.driftTime>.37&&!player.driftBonus) {
    player.driftBonus=true;
    if(selected!==1) {
      player.boost=Math.max(player.boost,.43);
      tone(550,780,.10,.105,"triangle");
    }
  }
  if(!player.driftTime) player.driftBonus=false;
  for(const kart of [player,...rivals]) {
    if(kart.finishedAt===undefined&&!isDisabled(kart,elapsed-dt)) rollWheels(kart);
    stepPose(kart,dt);
  }
  collectPickups([player,...rivals]);
  if(actions.delete("item")&&!disabled) useItem();
  if(actions.delete("special")&&!disabled) useSpecial();
  for(const bomb of bombs) {
    bomb.life-=dt;
    const travel=395*dt;
    let hit=Infinity;
    for(const kart of [player,...rivals]) {
      if(kart===bomb.owner||kart.finishedAt!==undefined||!canTakeBombHit(kart)) continue;
      const before=kart.previousProgress??kart.progress,lane=kart.previousLane??kart.lane;
      hit=Math.min(hit,segmentEntry(courseGap(before,bomb.progress),lane-bomb.lane,kart.progress-before-travel,kart.lane-lane,24,18));
    }
    bomb.progress+=travel*Math.min(1,hit);
    Object.assign(bomb,at(bomb.progress,bomb.lane));
    if(hit!==Infinity||bomb.life<=0) {explodeBomb(bomb);bomb.life=0;}
  }
  bombs=bombs.filter(bomb=>bomb.life>0);
  for(const spill of oil) {
    spill.t-=dt;
    for(const r of rivals) if(r!==spill.owner&&r.finishedAt===undefined&&Math.abs(courseGap(r.progress,spill.progress))<22&&Math.hypot(r.x-spill.x,r.y-spill.y)<19&&Math.abs(r.h-spill.h)<18) r.slow=Math.max(r.slow,1.1);
    if(!disabled&&player!==spill.owner&&Math.abs(courseGap(player.progress,spill.progress))<21&&Math.hypot(player.x-spill.x,player.y-spill.y)<16&&Math.abs(player.h-spill.h)<18&&player.ghost<=0&&!(selected===4&&player.impact>0)) player.slip=.75;
  }
  oil=oil.filter(spill=>spill.t>0);
  for(const p of sparks) {p.t-=dt;p.x+=p.dx*dt;p.y+=p.dy*dt;}
  let live=0;
  for(const spark of sparks) if(spark.t>0) sparks[live++]=spark;
  sparks.length=live;
  for(const effect of pulses) effect.life-=dt;
  pulses=pulses.filter(effect=>effect.life>0);
  if(playerFinished) {
    hud();needsDraw=true;
    state="finished";clearControls();get("notice").textContent="";
    get("raceBanner").hidden=true;
    const total=player.finishedAt-(player.startedAt||0);
    const personalBest=total<(bestTimes.get(trackIndex)??Infinity);
    if(personalBest) {
      bestTimes.set(trackIndex,total);
      bestMedals.set(trackIndex,raceMedal(total));
    }
    const bestLap=Number.isFinite(player.bestLap)?" · Schnellste Runde "+formatTime(player.bestLap):"";
    [392,494,587,784].forEach((pitch,i)=>tone(pitch,pitch,.22,.15,"triangle",i*.105));
    showOverlay("ZIEL · 5 / 5","PLATZ "+position+" / "+drivers.length+" · "+formatTime(total)+bestLap+(personalBest?" · Sitzungsbestzeit":"")+(raceMedal(total)?" · "+raceMedal(total):""),false);
  }
}
const motionPreference=window.matchMedia?.("(prefers-reduced-motion: reduce)");
let reducedMotion=!!motionPreference?.matches;
motionPreference?.addEventListener?.("change",event=>{reducedMotion=event.matches;needsDraw=true;});
const NEAR=13, FAR=650;
const kartArt=["data:image/webp;base64,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","data:image/webp;base64,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","data:image/webp;base64,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","data:image/webp;base64,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","data:image/webp;base64,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","data:image/webp;base64,UklGRmAJAABXRUJQVlA4WAoAAAAQAAAASQAARAAAQUxQSOcEAAABDAVt2zA1f9rdgRARE5CjDyg+jLsltdvWDknyhu6N7O6xbdu2bdu2bdu2bdtt2yobo2K+zxPPh3jjjaiKiJgACpEkSZKkBbasFs7iusPwIrgy7XkyMquaQURMAPqaKGHzD89acpPD9lsAxSb22n+3eXVPj21qvZBkgUgsM+rLuVY2i6edv0EJLNQZouokaU3f7FekAacOM0nvGXzzoAItNjaWwPLQ7VCghYabE01xNn/L4kR4xJz6VKTc8McyBTrHGi328O6rFui2hEW0o+EPFJYRnk3McfV+Ly1epPcSLDZnqVUHMQf2D3C1KfFBXLsWmEd/jd40ObW7izRwcIaXi4Q70qSqp4PozyQZsvSIOAViwxb1kewX9KYRb9rr4GN46AVIsk+ABH0kjhn9l4ytJ4Ih/r5gSjpw4J8fU/zp4gCzIncSzBhxkctm/l9U4oaduAiifkASzAgAC79s1goVs/cGIJmBzCEcGLT+fvttv804ky0VsfFLr7/XnmuWgAwMIomQCNjkysFt5XJHRZMEqoo2jW3r7Wn48dIVARIkfcwQGAHHP1dh9iqv60yvj5d8fPzx++eP9ATTGI7VHuyxWKSrm8v+4+O/X0uATCCAWbHZFFMn2aBKoj4+PlkAXgYgC9+ysuRooKBKfHIQEyRIAvBt3GguoQaV3TxgwxZLQwBIAiAZ4TBREdEgYwcjVr26x88QMkFs/0+cUDkd6FCwCUsFpXu80YJDLFvdMNu9yDctKi0y9b7s0Zy8JInTL7euVp20xHWb5UeSWGHCR2mlrm46EnsDJJkPANxuV0GPGgol2rkbgAz0Y+DKy25Vq1cKHmk7iH294uqrIph+LPF+fUWdSrY3LOVEVaWqqfGuiAFIuczMTMRYZVLhgCpJM+vYDMEkIy4zyUREk82b8SgsIioi9sYCDGACV5mamcX0TlRWETUz094TkYELDDFrqais69yQ9yTyX8W8+a1mb6aRZMRowEVvnLPW0kuv/MdHFfQsKhB7fckll1r/ihcOAUMQuHTFplOVExrtF2QlWTrg/gfvf+ixJx5/5JEvyu1tKOPOIP+/8MCDDz708GMPP3j1Bh4s+VinBeoNzyGiFth0OoCId5tzzolXtaSCzb60OVcR+29nADu0qHOSqlK0WY+oesbZiCUw8G1zTjKrzmoyqes6GD9OwmYN6iSz59voJj4+L12qTvoktEQrDe68Gtd9PwtTlZSeROdUed/2cpjF5o33Unb7/3lR4h42TixPdDkJ9+CBbdaz1d7rzaUHnFQtt+Oqch652zw0PqIdzjmXpWiojjrpkS5xTrJVtOlYs4cCr8q67JWJ9oijq6TDubR14OScTbqzdvc6FxaK8pb1VlzZ45wLabfuYDJZcsPemqRO0q9rc3/X+eba3PGgeVyaqJg/TSVYzZvmAnr33/0/FRHnnKTb4Ntvvumm5+aKmUdiM/WomU6497rrr72zWSWrTV8mespEXFJEnIho57ZILrv3IW9ZLKrWOnGmmqpa59VH7rM4ki+ZE+ecExGXUDkNWGOSqZNU1dheizwAFrqzqqu7bfCuCy9x+Yyuno6Z5wAAAWKLahNxkqoWPzMQxOpPTaytq6lraG5pbm5unX/HYghddaddNh0EAMvstPv2ywIkksS2b9c3NzQ2t7a1tbW0NP189kAAAFZQOCBSBAAAsBMAnQEqSgBFAD7RSqBMKCOjIi9dWxEAGglkAMtNqMnm3S57vTgIFe1HlDGRVs+aUsab19QxdGs9HczNuStBrmGOehva/Sv8UNmB6tFo/u3sK30TxDjZecV9HiNfrYSINxhn1uh/GuImhsA/v0+eV6LERJlGReqGMR+8UFkmIKffX/JYQX6/Qi9JGRHQ0A/marO0+FS/aIuwhYyiSRTcH8/BJW2UAAD+/Fzu7jRsrXpRsQqbR5Odpwk6Dr01+v5ZWs1iJll/jZtcX51SR7gVl/bBFBdjnBHbLwwOV7pMdaN0LGj85JPISA+V+Ltl5sRFLiL1KgdpWq0oqrWDlbTLhmaTQ6pfnUaVXwgC9jB/YXNuIReXDXU3Wb2Ov/4Fh17eZmhG4NSF/TgZe9/qjOn6w5ugRAFS/5UqPq8hcl5OwAg6xDOoRqUVp1jNq4Oxfl5DMQkSSB5gEytUJJkio8mcOhZOGeB9przZbZ01UpkYT2efXgFnRgPVL/mWemIF4GrAUqxPrgUtjTqz0ncGRgOSzOYxzoA/rq2Hg1nqhegePnX2fjHqI1Eb0b3iXpW9av91mEFqZdo15b97GKXo2zptnPDl8JUthlGhHUSsAlx2twJvVoiHfb27c4H1dblEuYpBLf21KHT2NFViVkx+u9VgtXMJw0R07Aw6QhPo3HZdmbbsyvlVUuvH8mV3J/WldJQJxQ3trNjVZkLHo4mr9yXWbuSQjJRuUdkZoqNbGvw6iIt/x44QHVDYTqgY3wJdgcQtKeW1tTcL++Xs3Aw10SsRspFiaWil6G+zkhGoCBqgUBittOxDgvm67XDrV688Ps/16sCXesNs2KR3HTIxgFzmYIOcE2yyyL2Kx+QgajE3+VbCGv/5Td1SdAbqjbyxbsE1TTCx6SNF6m7QDH+GGD5Dx8CmIfqFF7hufDsB/YRtzSYLP4UBufRO+MFQxrDcX44BZqd5Tt6aeYCjowiO5aR1FK6wfjb2l5nIlyGJVusSsMznvIKZUPp8vb6yb8AWBfsFjLIYZRn34mgxWILEHWeOi0mdweHY/7BhlwEAHu9toJEru+6/vdSq+l46Es5fs3N+4ghKB0yYsT/mDOgnWJ/fQnySUYSZzz8vLr1mG5CieSUg/xr3sTowvbCi7I9gt0nLpOavxm/EfJ5o6gin5z1toSyg99x6gOG5gjYd8pclp481znU6z6saTqxa1swsR/4i9e+Rd7PPbep67YySmVuAJyUY3z0/WVlUJXKYJ8AeStCoah51i4l8R4PtiTwrzo0oRb+5yAQfP3A4+vC1Rhjet+Q3ipdjCOEA3LE1u4JsNm7nSdl4x40IH77TfRTND0tTp+6284FEf1Qn+aNiv984y8RN61SrZZlasHgY3M8YTGepDxDqsr2XFsdDQ10MGn4pAm82sJrO7ZylbSS8VUdT+jeJ7Zhz7VtWSeCfiKII3YvMszcCHSZI662c0T7BYCAAAAA="].map(src=>{const image=new Image();image.src=src;return image;});
const road=[], terrain=[], shadows=[], buildings=[], reflectors=[], bendSigns=[], lamps=[], landmarks=[];
function bound(surface) {
  const x=(Math.min(...surface.points.map(p=>p.x))+Math.max(...surface.points.map(p=>p.x)))*.5;
  const y=(Math.min(...surface.points.map(p=>p.y))+Math.max(...surface.points.map(p=>p.y)))*.5;
  surface.bounds={x,y,r:Math.max(...surface.points.map(p=>Math.hypot(p.x-x,p.y-y)))};
  return surface;
}
function roadQuad(s0,s1,left,right,color,order,group=s0) {
  road.push(bound({points:[at(s0,left),at(s0,right),at(s1,right),at(s1,left)],color,order,sortPoint:at(group+6.5)}));
}
function groundQuad(points,color) {
  terrain.push(bound({points,color}));
}
function addBox(x,y,w,d,h,colors,base) {
  const slab=[
    {x:x-8,y:y-8,h:base-1},{x:x+w+8,y:y-8,h:base-1},
    {x:x+w+8,y:y+d+8,h:base-1},{x:x-8,y:y+d+8,h:base-1}
  ];
  const lip=slab.map(p=>({...p,h:base-5}));
  buildings.push({points:slab,color:tint(colors[2],-3)});
  for(let i=0;i<4;i++) {
    const j=(i+1)%4;
    buildings.push({points:[slab[i],slab[j],lip[j],lip[i]],color:tint(colors[2],-16)});
  }
  shadows.push(bound({points:[
    {x:x-2,y:y+2,h:base},{x:x+w+22,y:y+7,h:base},
    {x:x+w+25,y:y+d+18,h:base},{x:x+7,y:y+d+15,h:base}
  ],color:"#10121b"}));
  const a={x,y,h:base},b={x:x+w,y,h:base},c={x:x+w,y:y+d,h:base},e={x,y:y+d,h:base};
  const top=[a,b,c,e].map(p=>({...p,h:base+h}));
  buildings.push({points:top,color:colors[0]});
  for(const [i,[p,q]] of [[a,b],[b,c],[c,e],[e,a]].entries()) {
    const wall=colors[i%2+1];
    const point=(u,z)=>({x:p.x+(q.x-p.x)*u,y:p.y+(q.y-p.y)*u,h:base+z});
    const face={points:[p,q,{...q,h:base+h},{...p,h:base+h}],color:wall,details:[]};
    buildings.push(face);
    const strips=trackIndex===0?8:trackIndex===2?5:4;
    for(let k=0;k<strips;k++) {
      const a=(k+.2)/strips,b=(k+.39)/strips;
      face.details.push({points:[point(b,4),point(b+.023,4),point(b+.023,h-4),point(b,h-4)],color:tint(wall,-19)});
      face.details.push({points:[point(a,3),point(b,3),point(b,h-3),point(a,h-3)],color:tint(wall,k%2?17:-11),order:1});
      if(trackIndex===2||trackIndex===4) {
        for(const f of [.31,.64]) {
          face.details.push({points:[point(a,f*h),point((k+.78)/strips,f*h),point((k+.78)/strips,f*h+2.5),point(a,f*h+2.5)],color:circuits[trackIndex].theme[5],order:1});
        }
      }
    }
  }
}
function tint(hex,amount) {
  const color=Number.parseInt(hex.slice(1),16);
  const channels=[color>>16,(color>>8)&255,color&255];
  return "#"+channels.map(c=>clamp(c+amount,0,255).toString(16).padStart(2,"0")).join("");
}
function buildScenery() {
  for(const list of [road,terrain,shadows,buildings,reflectors,bendSigns,lamps,landmarks]) list.length=0;
  const course=circuits[trackIndex], [,shade,highlight,apron,asphalt,accent]=course.theme;
  // Continuous graded shoulders connect the pavement to the surrounding land.
  const verge=["#34353d","#8b5048","#492e44","#334343","#42424a","#33445b"][trackIndex];
  const land=["#242830","#683e40","#29263b","#25353b","#30313c","#29394e"][trackIndex];
  for(let s=0,index=0;s<length;s+=24,index++) {
    const end=Math.min(length,s+24);
    for(const side of [-1,1]) {
      const edge=side*(ROAD+8), shoulder=side*(ROAD+65), far=side*(ROAD+260);
      const outer0=at(s,far), outer1=at(end,far);
      outer0.h-=course.bridge?39:16;outer1.h-=course.bridge?39:16;
      groundQuad([at(s,shoulder),at(end,shoulder),outer1,outer0],tint(land,index%6===0?3:0));
      groundQuad([at(s,edge),at(end,edge),at(end,shoulder),at(s,shoulder)],tint(verge,index%3===0?4:0));
    }
  }
  for(let start=0,i=0;start<length;start+=13,i++) {
    const end=Math.min(length,start+13);
    roadQuad(start,end,-ROAD-10,ROAD+10,apron,0);
    roadQuad(start,end,-ROAD,ROAD,i%5===0?tint(asphalt,3):asphalt,1);
    for(const side of [-1,1]) {
      const [a,b]=[side*ROAD,side*(ROAD-5)].sort((x,y)=>x-y);
      roadQuad(start,end,a,b,i%4<2?"#e7d4bc":trackIndex===0?"#984737":accent,2);
      if(course.bridge||course.indoor) {
        const base0=at(start,side*(ROAD+8)), base1=at(end,side*(ROAD+8));
        buildings.push({points:[base0,base1,{...base1,h:base1.h+13},{...base0,h:base0.h+13}],color:i%3?"#665466":"#a17070"});
      }
    }
    if(i%3===0&&start>15&&end<length-15) roadQuad(start,end,-1.4,1.4,tint(accent,-21),3);
    if(start>18&&end<length-18) {
      for(const side of [-1,1]) {
        const lane=side*(15+wrap(i*47+side*12,63));
        const offset=wrap(i*29+side*9,8);
        roadQuad(start+offset,Math.min(end,start+offset+4+(i%4)),lane,lane+1.8,tint(asphalt,i%4===0?13:-10),2,start);
        if(i%4!==3) {
          const mark=side*(45+wrap(i*7,18));
          roadQuad(start,Math.min(end,start+8),mark,mark+1.2,tint(asphalt,-16),2);
        }
        if(i%5===2) {
          const edge=side*(ROAD-11)-1;
          roadQuad(start,Math.min(end,start+10),edge,edge+3.5,tint(asphalt,18),2);
        }
      }
    }
  }
  for(const strip of boostStrips) {
    for(let i=0;i<4;i++) {
      const s=strip.progress-12+i*6;
      roadQuad(s,s+4,strip.lane-13,strip.lane+13,i%2?"#86eaff":"#298ba0",5,Math.floor(s/13)*13);
    }
  }
  for(let i=0;i<2;i++) for(let j=0;j<14;j++) {
    roadQuad(i*7-7,i*7,-ROAD+j*ROAD/7,-ROAD+(j+1)*ROAD/7,(i+j)%2?"#eee2d6":"#252433",4,i===0?length-13:0);
  }
  for(let s=18;s<length;s+=29) {
    for(const side of [-1,1]) reflectors.push({...at(s,side*(ROAD+4)),gold:Math.floor(s/29)%2===0});
    const delta=wrap(at(s+62).angle-at(s).angle+Math.PI,TAU)-Math.PI;
    if(Math.abs(delta)>.45) bendSigns.push({...at(s,-Math.sign(delta)*(ROAD+19)),direction:Math.sign(delta)});
  }
  for(let s=70,i=0;s<length;s+=139,i++) {
    const side=i%2?1:-1;
    const light=at(s,(ROAD+21)*side);
    lamps.push({...light,color:accent});
    if(i%2===0) landmarks.push({...at(s+37,side*(ROAD+37)),side,variant:trackIndex});
    const a=at(s+31,(ROAD+62+9*(i%3))*side);
    const width=trackIndex===4?34:trackIndex===1?60:43;
    const depth=course.bridge?23:39;
    const protectedDistance=(ROAD+19)**2;
    if(!path.some(p=>{
      const nx=clamp(p.x,a.x-width/2,a.x+width/2),ny=clamp(p.y,a.y-depth/2,a.y+depth/2);
      return (p.x-nx)**2+(p.y-ny)**2<protectedDistance;
    })) {
      const h=course.indoor?54:trackIndex===1?54+(i%3)*29:course.bridge?76:24+(i%4)*14;
      addBox(a.x-width/2,a.y-depth/2,width,depth,h,[highlight,shade,apron],a.h);
    }
    if(course.indoor && i%2===0) {
      const l=at(s,-ROAD-6),r=at(s,ROAD+6),h=58;
      buildings.push({points:[{...l,h:l.h+h},{...r,h:r.h+h},{...r,h:r.h+h-5},{...l,h:l.h+h-5}],color:"#a4a296"});
    }
    if(course.bridge && i%3===0) {
      const l=at(s,-ROAD-12),r=at(s,ROAD+12),h=62;
      buildings.push({points:[{...l,h:l.h+h},{...r,h:r.h+h},{...r,h:r.h+h-7},{...l,h:l.h+h-7}],color:"#6d4857"});
    }
  }
  for(const surface of buildings) bound(surface);
}
let cam, viewport, viewAngle;
function resize() {
  // Low internal resolution gives the race the texture of an early console game.
  const w=canvas.clientWidth||1,h=canvas.clientHeight||1;
  const scale=Math.min(1,1080/w,650/h);
  canvas.width=Math.max(1,Math.round(w*scale));
  canvas.height=Math.max(1,Math.round(h*scale));
  needsDraw=true;
}
window.addEventListener("resize",resize);
resize();
function camera(follow,w,h,dt) {
  const target=at(follow.progress+18+Math.max(0,follow.v||0)*.085).angle;
  if(viewAngle===undefined) viewAngle=target;
  const change=wrap(target-viewAngle+Math.PI,TAU)-Math.PI;
  viewAngle+=change*(1-Math.exp(-8*dt));
  const fx=Math.cos(viewAngle),fy=Math.sin(viewAngle);
  const pullback=74+clamp((follow.v||0)/250,0,1)*8;
  cam={x:follow.x-fx*pullback,y:follow.y-fy*pullback,fx,fy,height:46+(follow.h||0)};
  viewport={x:w*.5,horizon:h*.24,focal:Math.min(h*.77,w*1.09),w,h};
}
function toCamera(p) {
  const dx=p.x-cam.x,dy=p.y-cam.y;
  return {side:-cam.fy*dx+cam.fx*dy,depth:cam.fx*dx+cam.fy*dy,h:p.h||0};
}
function project(p) {
  const scale=viewport.focal/p.depth;
  return {x:viewport.x+p.side*scale,y:viewport.horizon+(cam.height-p.h)*scale,scale};
}
function clip(points,limit,near) {
  const result=[];
  const inside=p=>near?p.depth>=limit:p.depth<=limit;
  let a=points[points.length-1];
  for(const b of points) {
    if(inside(a)!==inside(b)) {
      const t=(limit-a.depth)/(b.depth-a.depth);
      result.push({depth:limit,side:a.side+(b.side-a.side)*t,h:a.h+(b.h-a.h)*t});
    }
    if(inside(b)) result.push(b);
    a=b;
  }
  return result;
}
function shape(points,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fill();
}
function polygon(surface) {
  if(surface.bounds) {
    const q=toCamera(surface.bounds), radius=surface.bounds.r;
    if(q.depth+radius<NEAR||q.depth-radius>FAR) return null;
    if(Math.abs(q.side)-radius>(q.depth+radius)*viewport.w/(viewport.focal*2)+18) return null;
  }
  const p=clip(clip(surface.points.map(toCamera),NEAR,true),FAR,false);
  if(p.length<3) return null;
  const points=p.map(project);
  const depth=surface.sortPoint?toCamera(surface.sortPoint).depth:p.reduce((sum,v)=>sum+v.depth,0)/p.length;
  return {points,color:surface.color,order:surface.order||0,depth};
}
function skyline(w,h,horizon) {
  const theme=circuits[trackIndex].theme;
  const image=panoramas[trackIndex];
  if(image.complete&&image.naturalWidth) {
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle=theme[3];ctx.fillRect(0,0,w,h);
    const height=Math.ceil(horizon+h*.225);
    const width=Math.ceil(Math.max(w*1.04,height*image.naturalWidth/image.naturalHeight));
    const offset=wrap(viewAngle*width/TAU,width);
    // Alternate reflected copies so the illustrated skyline joins without a hard seam.
    const start=Math.floor(viewAngle/TAU);
    for(let i=-1;i<2;i++) {
      const x=Math.floor(i*width-offset);
      ctx.save();ctx.translate(x+(wrap(start+i,2)?width:0),0);
      if(wrap(start+i,2)) ctx.scale(-1,1);
      ctx.drawImage(image,0,0,width,height);ctx.restore();
    }
    return;
  }
  ctx.fillStyle=theme[0];ctx.fillRect(0,0,w,horizon);
  ctx.fillStyle=theme[1];ctx.fillRect(0,horizon*.56,w,horizon*.44);
  ctx.fillStyle=theme[2];ctx.fillRect(0,horizon*.82,w,horizon*.18);
  ctx.fillStyle=theme[5];ctx.fillRect(w*.73,horizon*.29,Math.max(5,h*.026),Math.max(5,h*.026));
  const offset=viewAngle*viewport.focal*.2;
  const course=circuits[trackIndex];
  if(course.indoor) {
    rect(0,0,w,horizon*.6,"#232530");
    rect(w*.18,horizon*.48,w*.64,Math.max(2,horizon*.045),theme[5]);
  }
  for(let i=-1;i<Math.ceil(w/24)+1;i++) {
    const x=i*24-wrap(offset,24),index=i+Math.floor(offset/24);
    const a=wrap(index*47+37,29),b=wrap(index*29+15,12);
    ctx.fillStyle=index%3?"#171d2a":"#212330";
    ctx.fillRect(x,horizon-8-a,22+b,9+a);
    ctx.fillStyle=index%4?"#6b5350":"#ba8258";
    ctx.fillRect(x+6,horizon-6-Math.floor(a/2),2,2);
  }
  ctx.fillStyle=theme[3];ctx.fillRect(0,horizon,w,h-horizon);
  for(let depth=FAR;depth>22;depth/=1.32) {
    const y=horizon+46*viewport.focal/depth;
    ctx.fillStyle="#332e37";ctx.fillRect(0,Math.round(y),w,1);
  }
}
function billboard(p,style,value) {
  const c=toCamera(p);
  if(c.depth<NEAR||c.depth>FAR) return null;
  const screen=project(c);
  if(screen.x < -100 || screen.x > viewport.w+100 || screen.y>viewport.h+100) return null;
  return {depth:c.depth,draw:()=>style(screen,value)};
}
function rect(x,y,w,h,color) {
  ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
}
const WHEEL_RADIUS=5.5, HALF_AXLE=10.5;
function rollWheels(kart) {
  const d=kart.progress-kart.previousProgress;
  const yaw=wrap(kart.angle-(kart.previousAngle??kart.angle)+Math.PI,TAU)-Math.PI;
  kart.wheels??=[0,0];
  if(Math.abs(d)<1e-9) return;
  const grip=kart.slip>0?.78:1;
  for(let i=0;i<2;i++) {
    const side=i===0?1:-1;
    const distance=d+side*yaw*HALF_AXLE;
    const angle=kart.wheels[i]+distance/WHEEL_RADIUS*grip;
    kart.wheels[i]=Math.abs(angle)>TAU*32?angle%TAU:angle;
  }
}
function tirePhase(kart,side=0) {
  return wrap((kart.wheels?.[side]??kart.progress/WHEEL_RADIUS)/TAU,1);
}
function drawTread(kart,w,h) {
  for(let i=0;i<2;i++) {
    const side=i===0?-1:1, phase=tirePhase(kart,i)*TAU;
    const x=side*w*.415, y=3-h*.20;
    ctx.save();ctx.beginPath();ctx.ellipse(x,y,w*.068,h*.144,0,0,TAU);ctx.clip();
    for(let row=0;row<10;row++) {
      const angle=(row/10)*TAU+phase;
      if(Math.cos(angle)<.04) continue;
      const yy=y+Math.sin(angle)*h*.132;
      ctx.strokeStyle="rgba(155,151,175,"+(.11+Math.cos(angle)*.16)+")";ctx.lineWidth=.55;
      ctx.beginPath();ctx.moveTo(x-w*.055,yy-.3*side);ctx.lineTo(x,yy+.23*side);ctx.lineTo(x+w*.052,yy+.65*side);ctx.stroke();
    }
    ctx.restore();
  }
}
function stepPose(kart,dt) {
  const pose=kart.pose??={lean:0,pitch:0,roll:0};
  const speed=kart.v??0;
  const yaw=wrap(kart.angle-(kart.previousAngle??kart.angle)+Math.PI,TAU)-Math.PI;
  const sideAcceleration=((kart.lateral||0)-(kart.previousLateral??kart.lateral??0))/dt;
  const lateral=(kart.lateral||0)*.010+sideAcceleration*.0012+yaw/dt*speed*.004;
  const acceleration=(speed-(kart.previousV??speed))/dt;
  const rate=1-Math.exp(-7*dt);
  pose.lean+=(clamp(lateral,-1,1)-pose.lean)*rate;
  pose.pitch+=(clamp(-acceleration/490,-.65,.65)-pose.pitch)*rate;
  pose.roll+=(clamp(lateral*.58,-.58,.58)-pose.roll)*rate;
}
function kartLean(kart) {
  if(reducedMotion) return 0;
  if(kart.pose) return kart.pose.lean;
  if(kart===player) return clamp((kart.bank||0)*.90+(kart.lateral||0)/280,-1,1);
  return clamp(((kart.lane||0)-(kart.previousLane??kart.lane??0))*15,-.65,.65);
}
function drawKartArt(art,w,h,lean,pitch) {
  const bands=14;
  for(let i=0;i<bands;i++) {
    const a=Math.round(art.naturalHeight*i/bands), b=Math.round(art.naturalHeight*(i+1)/bands);
    const torso=1-i/bands;
    const anchor=Math.max(0,(torso-.47)/.53);
    const shift=lean*w*.096*anchor**1.3;
    ctx.drawImage(art,0,a,art.naturalWidth,b-a,-w/2+shift,-h+3+i*h/bands+pitch*anchor*1.8,w,h/bands+.29);
  }
}
function sprite(p,r) {
  const s=p.scale;
  const turn=clamp(Math.sin(r.angle-viewAngle),-.85,.85);
  const isPlayer=r===player;
  const art=kartArt[r.driver];
  if(art?.complete&&art.naturalWidth) {
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(s,s);
    ctx.fillStyle="#12111c8e";ctx.beginPath();ctx.ellipse(2,1,21,5,0,0,TAU);ctx.fill();
    ctx.fillStyle="#0f1019d5";ctx.beginPath();ctx.ellipse(0,0,15,3,0,0,TAU);ctx.fill();
    if(isPlayer&&r.ghost>0) ctx.globalAlpha=.6;
    const lean=kartLean(r);
    ctx.rotate(reducedMotion?0:(r.pose?.roll??lean)*.077);
    if(!reducedMotion) ctx.translate(0,Math.sin(r.progress*.13)*clamp(Math.abs(r.v||0)/190,0,1)*.45);
    const w=isPlayer?36:30, h=w*art.naturalHeight/art.naturalWidth;
    ctx.imageSmoothingEnabled=false;
    if(reducedMotion||Math.abs(lean)+Math.abs(r.pose?.pitch||0)<.035||s<.55) ctx.drawImage(art,-w/2,-h+3,w,h);
    else drawKartArt(art,w,h,lean,r.pose?.pitch||0);
    if(s>.8&&!reducedMotion) drawTread(r,w,h);
    if(r.braking) {
      for(const side of [-1,1]) {
        rect(side*w*.214-w*.059,3-h*.229,w*.118,h*.053,"#ff532be0");
        rect(side*w*.214-w*.031,3-h*.216,w*.062,h*.021,"#fff5a4");
      }
    }
    if(isDisabled(r)) {
      const remaining=Math.max(0,r.disabledUntil-elapsed);
      ctx.fillStyle="#211621";ctx.fillRect(-12,-h-9,24,3);
      ctx.fillStyle="#ffb26d";ctx.fillRect(-12,-h-9,24*remaining/BOMB_TIMEOUT,3);
      if(!reducedMotion) for(let i=0;i<3;i++) {
        const rise=wrap(elapsed*1.8+i*.33,1);
        ctx.globalAlpha=(1-rise)*.55;
        rect(-5+i*4+rise*2,-h*.75-rise*8,2+rise*3,2+rise*3,"#d1a3a3");
      }
      ctx.globalAlpha=1;
    }
    if(r.hitUntil>elapsed) {
      ctx.font="bold 10px monospace";ctx.textAlign="center";
      ctx.lineWidth=3;ctx.strokeStyle="#161623";ctx.strokeText(r.hitText,0,-h-5);
      ctx.fillStyle="#fff0b4";ctx.fillText(r.hitText,0,-h-5);
    }
    if(isPlayer&&((selected===4&&r.impact>0)||r.ghost>0)) {
      ctx.strokeStyle=selected===4?"#e8c975":"#97d9f2";
      ctx.lineWidth=1.25;
      ctx.beginPath();ctx.ellipse(0,-h*.36,w*.56,h*.47,0,0,TAU);ctx.stroke();
    }
    if(r.boost>0) {
      const flame=8+(reducedMotion?2:Math.floor(elapsed*39)%10);
      ctx.globalAlpha=.54;
      ctx.fillStyle="#ff883d";ctx.beginPath();ctx.ellipse(0,4,15,5,0,0,TAU);ctx.fill();
      ctx.globalAlpha=isPlayer&&r.ghost>0?.6:1;
      for(const offset of [-7,7]) {
        shape([{x:offset-3,y:-3},{x:offset+3,y:-3},{x:offset,y:flame}],"#ff7839");
        rect(offset-1,-2,2,flame*.6,"#ffe49e");
      }
    }
    ctx.restore();
    return;
  }
  ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(s,s);
  rect(-19,-3,38,6,"#16131b");
  if(isPlayer&&r.ghost>0) ctx.globalAlpha=.6;
  rect(-18,-11,9,13,"#12141e");rect(9,-11,9,13,"#12141e");
  rect(-16,-11,3,9,"#3d414c");rect(13,-11,3,9,"#3d414c");
  shape([{x:-12,y:-8},{x:-9+turn*8,y:-19},{x:9+turn*8,y:-19},{x:12,y:-8}],r.color);
  rect(-14,-10,28,9,r.color);
  rect(-12,-8,24,6,"#24232b");
  rect(-11,-7,5,3,"#ff6042");rect(6,-7,5,3,"#ff6042");
  rect(-5,-8,10,4,"#a5a2a2");
  ctx.translate(turn*7,0);
  rect(-7,-20,14,9,"#141722");rect(-6,-26,12,11,r.color);
  rect(-4,-28,8,2,"#e4d5c3");rect(-5,-22,10,3,"#343748");
  if(isPlayer&&r.boost>0) {
    const flame=5+Math.floor(elapsed*39)%5;
    shape([{x:-5,y:-3},{x:5,y:-3},{x:1,y:flame}],"#ff793d");
    rect(-2,-2,4,flame*.54,"#ffe1a8");
  }
  ctx.restore();
}
// Draw recognizable pictograms against an opaque tile at racing distance.
function drawIcon(item) {
  if(item.id==="nitro") {
    shape([{x:1,y:-9},{x:-6,y:1},{x:-1,y:1},{x:-3,y:8},{x:7,y:-2},{x:2,y:-2},{x:5,y:-9}],"#fff6a9");
  } else if(item.id==="bomb") {
    ctx.fillStyle="#202437";ctx.beginPath();ctx.arc(-2,2,6.3,0,TAU);ctx.fill();
    ctx.strokeStyle="#d8c6c7";ctx.lineWidth=1.4;ctx.stroke();
    rect(-5,-1,2,2,"#fff3ef");rect(-2,-6,4,3,"#e1d5c2");
    ctx.strokeStyle="#fff1a4";ctx.lineWidth=1.65;ctx.beginPath();
    ctx.moveTo(1,-6);ctx.lineTo(3,-9);ctx.lineTo(6,-8);ctx.stroke();
    rect(6,-10,2,4,"#ffb163");rect(5,-9,4,2,"#ffb163");
  } else if(item.id==="oil") {
    ctx.fillStyle="#fff1fa";ctx.beginPath();ctx.moveTo(0,-8);
    ctx.bezierCurveTo(-2,-4,-6,0,-6,3);ctx.bezierCurveTo(-6,10,6,10,6,3);ctx.bezierCurveTo(6,0,2,-4,0,-8);ctx.fill();
    rect(-3,2,2,2,"#8f5cb9");
  } else {
    ctx.strokeStyle="#e9ffff";ctx.lineWidth=1.65;
    for(const r of [4.2,8.2]) {
      ctx.beginPath();ctx.arc(0,4,r,-2.6,-.54);ctx.stroke();
    }
    rect(-1.4,3,2.8,2.8,"#e9ffff");
  }
}
function pickup(p,pad) {
  const s=p.scale;
  rect(p.x-8*s,p.y-1,16*s,Math.max(1,3*s),"#231f29");
  if(pad.readyAt>elapsed) return;
  const scale=Math.max(.48,Math.min(1.9,s*.92));
  ctx.save();ctx.translate(p.x,p.y-19*s+Math.sin(elapsed*4+pad.progress)*2*s);ctx.scale(scale,scale);
  rect(-11,-11,22,22,"#151623");rect(-10,-10,20,2,pad.item.color);rect(-10,8,20,2,pad.item.color);
  rect(-10,-8,2,16,pad.item.color);rect(8,-8,2,16,pad.item.color);
  drawIcon(pad.item);ctx.restore();
}
function bombSprite(p) {
  ctx.save();ctx.translate(p.x,p.y-10*p.scale);ctx.scale(p.scale,p.scale);
  drawIcon(items[1]);ctx.restore();
}
function landmark(p,prop) {
  const s=p.scale;
  ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);
  if(prop.variant===1||prop.variant===3) {
    const desert=prop.variant===1;
    if(desert) {
      rect(-3,-24,6,24,"#294d3c");rect(-9,-18,5,10,"#39604b");rect(4,-15,6,5,"#417257");
      rect(-2,-24,2,20,"#66916b");
    } else {
      rect(-2,-18,4,18,"#413831");
      for(let j=0;j<3;j++) shape([{x:0,y:-41+j*8},{x:-8-j*2,y:-16+j*3},{x:8+j*2,y:-16+j*3}],"#2d594b");
    }
  } else if(prop.variant===2) {
    rect(-12,-24,24,4,"#ab3253");rect(-10,-20,3,20,"#5c3748");rect(8,-20,3,20,"#59334e");
    for(let i=-8;i<=8;i+=8) {rect(i-2,-19,4,6,"#cf5648");rect(i-1,-18,2,3,"#ffe0a0");}
  } else {
    rect(-10,-12,20,12,"#47434a");
    for(let x=-9;x<9;x+=6) shape([{x,y:-2},{x:x+3,y:-2},{x:x+8,y:-10},{x:x+5,y:-10}],"#d3a865");
  }
  ctx.restore();
}
const lightingProfiles=[
    {lamp:.69,fill:"#c2a075",sky:"#7784bd"},
    {lamp:.23,fill:"#fdae6b",sky:"#e28380"},
    {lamp:.78,fill:"#ff79a3",sky:"#a57aff"},
    {lamp:.65,fill:"#ffd48e",sky:"#829cdb"},
    {lamp:.88,fill:"#ffe6b4",sky:"#8194b6"},
    {lamp:.33,fill:"#ffbe92",sky:"#be88b8"}
  ];
function trackLighting() {
  return lightingProfiles[trackIndex];
}
function lamp(p) {
  const s=p.scale,top=p.y-53*s;
  rect(p.x-1.5*s,top,3*s,53*s,"#50434b");
  rect(p.x-6*s,top,12*s,4*s,circuits[trackIndex].theme[5]);
  rect(p.x-4*s,top+3*s,8*s,2*s,"#ffe0a0");
  if(s>.2) {
    ctx.save();ctx.globalAlpha=.16;
    rect(p.x-9*s,top-3*s,18*s,11*s,circuits[trackIndex].theme[5]);ctx.restore();
  }
}
function bendSign(p,sign) {
  const s=p.scale;
  rect(p.x-s,p.y-20*s,2*s,20*s,"#55494a");
  rect(p.x-10*s,p.y-24*s,20*s,10*s,"#29232d");
  for(const x of [-5,2]) {
    ctx.strokeStyle="#ffd075";ctx.lineWidth=Math.max(1,s*1.8);ctx.beginPath();
    ctx.moveTo(p.x+(x-2*sign.direction)*s,p.y-22*s);
    ctx.lineTo(p.x+(x+sign.direction)*s,p.y-19*s);
    ctx.lineTo(p.x+(x-2*sign.direction)*s,p.y-16*s);
    ctx.stroke();
  }
}
function reflector(p,post) {
  const s=p.scale;
  rect(p.x-2*s,p.y-9*s,4*s,9*s,"#2b2530");
  rect(p.x-2*s,p.y-8*s,4*s,2*s,post.gold?"#efb16a":"#81a8bf");
}
function spillSprite(p) {
  ctx.fillStyle="#191722";ctx.beginPath();
  ctx.ellipse(p.x,p.y,15*p.scale,3.5*p.scale,0,0,TAU);ctx.fill();
  rect(p.x-5*p.scale,p.y-1,6*p.scale,Math.max(1,p.scale),"#766383");
}
function miniMap(w,h) {
  if(!player||state==="menu") return;
  const mapWidth=Math.min(w*.23,h*.32,137);
  const s=mapWidth/(mapBounds.right-mapBounds.left),height=(mapBounds.bottom-mapBounds.top)*s;
  const x=w-mapWidth-8,y=h-Math.max(43,h*.12)-height;
  rect(x-4,y-3,mapWidth+8,height+6,"#121622ce");
  ctx.save();ctx.translate(x-mapBounds.left*s,y-mapBounds.top*s);ctx.scale(s,s);
  ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);
  for(const p of path.slice(1)) ctx.lineTo(p.x,p.y);
  ctx.closePath();ctx.lineWidth=2.6/s;ctx.strokeStyle="#b69d81";ctx.stroke();
  for(const kart of [...rivals,player]) {
    const size=(kart===player?5:3)/s;
    rect(kart.x-size*.5,kart.y-size*.5,size,size,kart===player?"#fff2c9":kart.color);
  }
  ctx.restore();
}
const sceneryCache=new Map();
function useScenery(index) {
  const lists=[road,terrain,shadows,buildings,reflectors,bendSigns,lamps,landmarks];
  const cached=sceneryCache.get(index);
  if(cached) {
    for(const [i,list] of lists.entries()) {
      list.length=0;list.push(...cached[i]);
    }
    return;
  }
  buildScenery();
  sceneryCache.set(index,lists.map(list=>list.slice()));
}
function drawPreviews() {
  const selectedCourse=trackIndex, gameContext=ctx;
  const selectedPreview=get("courses").children[selectedCourse];
  for(const [i,button] of [...get("courses").children].entries()) {
    const preview=button.querySelector("canvas");
    if(preview.dataset.rendered||!panoramas[i].complete||!panoramas[i].naturalWidth) continue;
    loadCircuit(i);
    ctx=preview.getContext("2d");
    draw(0,preview);
    preview.dataset.rendered="1";preview.hidden=false;button.querySelector("img").hidden=true;
  }
  ctx=gameContext;
  if(trackIndex!==selectedCourse) loadCircuit(selectedCourse);
  if(selectedPreview) needsDraw=true;
}
let blurBuffer,blurContext;
function blurStrength(kart) {
  return !reducedMotion&&kart?.boost>0?clamp((Math.abs(kart.v)-125)/220,0,1):0;
}
function blurScenery(target,strength) {
  if(strength<.09) return;
  const w=target.width,h=target.height;
  if(!blurBuffer) {
    blurBuffer=document.createElement("canvas");
    blurContext=blurBuffer.getContext("2d");
  }
  if(!blurContext) return;
  if(blurBuffer.width!==w||blurBuffer.height!==h) {blurBuffer.width=w;blurBuffer.height=h;}
  blurContext.clearRect(0,0,w,h);blurContext.drawImage(target,0,0);
  const edge=Math.round(w*.24), spread=Math.ceil(strength*6);
  for(let i=0;i<2;i++) {
    const x=i?w-edge:0;
    ctx.save();ctx.beginPath();ctx.rect(x,0,edge,h);ctx.clip();
    ctx.globalAlpha=strength*.24;
    for(let j=1;j<=2;j++) ctx.drawImage(blurBuffer,(i?1:-1)*j*spread,j*spread/2);
    ctx.restore();
  }
}
function lightPool(point,radius,color,power) {
  const p=toCamera(point);
  if(p.depth<NEAR||p.depth>FAR*.68||power<.014) return;
  const center=project(p),r=radius*center.scale;
  if(center.x+r<0||center.x-r>viewport.w||center.y>viewport.h+r*.39) return;
  ctx.save();ctx.translate(center.x,center.y);ctx.scale(1,.35);
  ctx.globalCompositeOperation="screen";ctx.globalAlpha=power;
  const halo=ctx.createRadialGradient(0,0,0,0,0,Math.max(.1,r));
  halo.addColorStop(0,color);halo.addColorStop(1,"#0000");
  ctx.fillStyle=halo;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
}
function draw(dt,target=canvas) {
  const w=target.width,h=target.height;
  const follow=target===canvas&&player&&state!=="menu"?player:{...at(-24,0),progress:-24};
  camera(follow,w,h,dt);
  skyline(w,h,viewport.horizon);
  const ground=[];
  for(const surface of terrain) {
    const p=polygon(surface);
    if(p) ground.push(p);
  }
  ground.sort((a,b)=>b.depth-a.depth);
  for(const p of ground) shape(p.points,p.color);
  ctx.save();ctx.globalAlpha=.31+trackLighting().lamp*.13;
  for(const shadow of shadows) {
    const p=polygon(shadow);
    if(p) shape(p.points,p.color);
  }
  ctx.restore();
  ground.length=0;
  for(const surface of road) {
    const p=polygon(surface);
    if(p) ground.push(p);
  }
  ground.sort((a,b)=>b.depth-a.depth||a.order-b.order);
  for(const p of ground) {
    shape(p.points,p.color);
    const fog=clamp((p.depth-320)/550,0,.33);
    if(fog>.015&&p.order<3) {
      ctx.globalAlpha=fog;shape(p.points,circuits[trackIndex].theme[1]);ctx.globalAlpha=1;
    }
  }
  const light=trackLighting();
  for(const lamp of lamps) {
    lightPool(lamp,40,light.fill,light.lamp*.44);
    const projection=toCamera(lamp);
    if(projection.depth<290&&projection.depth>24) lightPool({...lamp,h:lamp.h+41},12,light.fill,light.lamp*.26);
  }
  if(target===canvas&&state==="race") {
    if(player.braking) {
      const rear=at(player.progress-9,player.lane);
      lightPool(rear,22,"#ff412e",.29);
    }
    for(const blast of pulses) {
      if(blast.color==="#ffab64") lightPool(blast,73,"#ff9039",blast.life*.75);
    }
    for(const points of skidMarks) {
      const mark=polygon({points,color:"#1b19234b"});
      if(mark) shape(mark.points,mark.color);
    }
    blurScenery(target,blurStrength(player));
  }
  if(target===canvas&&state==="race"&&player.boost>0) {
    lightPool(at(player.progress-13,player.lane),24,"#ff863b",.32);
  }
  const layers=[];
  if(target===canvas&&state!=="courses") for(const effect of pulses) {
    const radius=effect.radius*(1-effect.life/.5);
    const surface={points:Array.from({length:28},(_,i)=>({
      x:effect.x+Math.cos(i*TAU/28)*radius,y:effect.y+Math.sin(i*TAU/28)*radius,h:effect.h
    })),color:effect.color};
    const p=polygon(surface);
    if(p) {
      ctx.save();ctx.globalAlpha=Math.min(.8,effect.life*1.8);ctx.strokeStyle=effect.color;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(p.points[0].x,p.points[0].y);
      for(const point of p.points.slice(1)) ctx.lineTo(point.x,point.y);
      ctx.closePath();ctx.stroke();ctx.restore();
    }
  }
  for(const surface of buildings) {
    const p=polygon(surface);
    if(p) layers.push({depth:p.depth,draw:()=>{
      shape(p.points,p.color);
      if(p.depth>240) {
        ctx.save();ctx.globalAlpha=Math.min(.2,(p.depth-240)/1650);
        shape(p.points,trackLighting().sky);ctx.restore();
      }
      for(const detail of surface.details||[]) {
        const projected=polygon(detail);
        if(projected) shape(projected.points,projected.color);
      }
    }});
  }
  const props=[[lamps,lamp],[landmarks,landmark],[reflectors,reflector],[bendSigns,bendSign],[pads,pickup]];
  if(target===canvas&&state!=="courses") props.push([oil,spillSprite],[bombs,bombSprite]);
  for(const [objects,render] of props) {
    for(const item of objects) {
      const layer=billboard(item,render,item);
      if(layer) layers.push(layer);
    }
  }
  if(target===canvas&&player&&state!=="menu") {
    for(const kart of [...rivals,player]) {
      const layer=billboard(kart,sprite,kart);
      if(layer) layers.push(layer);
    }
    for(const spark of sparks) {
      const layer=billboard({...spark,h:spark.h+6},(p,s)=>rect(p.x,p.y,Math.max(1,p.scale*2),Math.max(1,p.scale*2),s.color),spark);
      if(layer) layers.push(layer);
    }
  }
  layers.sort((a,b)=>b.depth-a.depth);
  for(const layer of layers) layer.draw();
  if(target===canvas&&state==="race"&&blurStrength(player)>.22) {
    const strength=blurStrength(player);
    ctx.save();ctx.strokeStyle="#ffe0b6";ctx.globalAlpha=strength*.39;ctx.lineWidth=1;
    for(let i=0;i<11;i++) {
      const t=wrap(elapsed*(1.4+i*.062)+i*.381,1);
      const side=i%2?1:-1, x=w*(.5+side*(.29+.21*t)),y=h*(.27+.64*t);
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*(8+24*t)*strength,y+(4+11*t)*strength);ctx.stroke();
    }
    ctx.restore();
  }
  if(target===canvas&&state!=="courses") miniMap(w,h);
}
function frame(now) {
  const dt=frameTime===null?0:clamp((now-frameTime)/1000,0,.2);
  frameTime=now;
  if(state==="race") {
    accumulator+=dt;
    while(accumulator+1e-9>=STEP&&state==="race") {
      update(STEP);
      accumulator=Math.max(0,accumulator-STEP);
    }
  }
  if(state==="race"&&player) hud();
  if(state==="race"||needsDraw) {
    needsDraw=false;
    draw(dt);
  }
  updateAudio();
  requestAnimationFrame(frame);
}
loadCircuit(0);
get("menu").style.setProperty("--yard",'url("'+trackArt[0]+'")');
for(const image of panoramas) {
  image.addEventListener("load",()=>{needsDraw=true;if(state==="courses") drawPreviews();});
}
requestAnimationFrame(frame);
